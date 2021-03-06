// Core dependencies
const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const axios = require('axios');
const os = require('os');

// Schemas and models
const SKU = require('../model/sku_model');
const ManufacturingGoal = require('../model/manufacturing_goal_model');
const ManufacturingSchedule = require('../model/manufacturing_schedule_model');
const ManufacturingLine = require('../model/manufacturing_line_model');
const User = require('../model/user_model');

// Utilities
const PriorityQueue = require('../utils/priority_queue')
const jwtDecode = require('jwt-decode');
const schedule_filter = require('../controllers/schedule_filter');

/****************************************************************************************************
 * NAIVE ALGORITHM
 ****************************************************************************************************/

/**
 * API to automate manufacturing scheduling via the naive methodology proposed in the evolution
 * requirements. Using a list of activities to schedule -- represented as SKU / goal pairs -- and a
 * an absolute timeframe, the naive algorithm attempts to schedule as many activities as possible in
 * the time period. To reframe the algorithm shortly, activities are first sorted by deadline, and then
 * to break ties, by duration of the activity. The duration is a function of the SKU's manufacturing
 * rate and the case quantity of the SKU needed to fulfill the manufacturing goal activity. Then, the
 * algorithm attempts to schedule activities one at a time, essentially trying to schedule the activity
 * on a manufacturing line greedily; more precisely, that the activity finishes as quickly as possible.
 * Since this is a complicated NP-complete problem, the complex algorithm attempts to solve some of the
 * flaws in this approach.
 * 
 * Diving more into the specifics of the implementation, we first convert the start and end periods to EST
 * because the manufacturing manufacturing_lines operate 8AM - 6PM. A priority queue is leveraged to sort the activities
 * as mentioned in the algorithm overview, and an activity processing function is used to calculate the
 * duration and retrieve the deadline of the activity (from the ManufacturingGoal collection). Tasks are 
 * popped from the priority queue, and we attempt to schedule the task. We attempt to schedule the task 
 * on a set intersection of the manufacturing_lines available to the plant manager and the manufacturing_lines the SKU can be produced
 * on. For each line, we will (1) check if there is space on the line for the activity, (2) what it the
 * earliest it can be scheduled. Then, choosing the optimal line for production is trivial as it is simply
 * a Math.min() over all the manufacturing_lines. 
 * 
 * We first set the start time of our proposed activity as the start time of the timeframe. Then, we retrieve 
 * all of the manufacturing activities currently on the line, and iterate through all of them making sure
 * that we don't have any overlap. If there is overlap and a conflict is detected, we add an hour to the
 * start time and try again. We keep going until we find a start time in which no other existing activity 
 * conflicts. If we do we break out of the loop, and update the earliest start time over all the manufacturing_lines if it 
 * is so (Math.min call that was described above). It may be that all manufacturing_lines are full, and the activity isn't 
 * schedulable at any time over all the manufacturing_lines, in which case we return an error message and stop trying to add 
 * any other activities. If the activity is schedulable, we simply add an uncommitted entry to our collection,
 * and move on to the next activity.
 * 
 * @note The implementation of the algorithm is sequestered to another function because it is called by the
 * complex algorithm, in case the complex algorithm is unable to reach an optimal allocation or an execution
 * error occurs.
 * 
 * @todo Perhaps it makes sense to continue adding activities even if one is not schedulable, since different 
 * activities have different resource dependencies and future activities could be schedulable.
 * 
 * @param {JSON} req Request from client to automatically schedule manufacturing activities given start / end date
 * @param {JSON} res Response to send indicating success if all activities were schedulable
 * 
 * @since Evolution 4, Requirement 4.4.13
 */
router.post('/naive', async(req, res) => {
    return await automate_naive(req, res);
});

function getUser(req){
    let jwt = req.headers.authorization
    let payload = jwt.split(' ')[1]
    let decoded = jwtDecode(payload)

    return decoded.email;  
}

async function automate_naive(req, res) {
    let { activities, start_, end_ } = req.body;

    let start = moment(start_).tz("America/New_York")
    let end = moment(end_).tz("America/New_York")
    console.log(`The start date in EST is ${start.format()} and the end date in EST is ${end.format()}.`);

    let pq = makePriorityQueue();
    for (let activity of activities) {
        let t = await processActivity(activity);
        console.log(activity)
        pq.push(t);
    }
    
    let valid_lines = await getAccesibleManufacturingLines(req);
    let errors = [];

    while (true) {
        let task = pq.pop();
        if (!task) break;
        let schedulable = false;
        let earliestStartTime = moment(end);
        let bestLine;

        for(let valid_line of valid_lines){
            console.log(await ManufacturingLine.find({_id: valid_line}));

            for (let line of task.sku.manufacturing_lines) {
                if(line.equals(valid_line._id)){
                    console.log("Am i ever in here lol");
                    let schedulableOnLine = false;
                    // We also compare to committed activities
                    let preExistingActivities = await ManufacturingSchedule.find({
                        manufacturing_line: line
                    });
        
                    let interval = skipToWorkingHours(moment(start), calculateEndTime(moment(start), task.duration), task.duration);

                    while (interval.end <= end) {
                        interval = skipToWorkingHours(interval.start, interval.end, task.duration);
                        let conflict = false;
                        for (let preExistingActivity of preExistingActivities) {
                            let otherStart = moment(preExistingActivity.start_date).tz("America/New_York");
                            let otherEnd = calculateEndTime(otherStart, preExistingActivity.duration);
                            if (interval.start < otherEnd && interval.end > otherStart) {
                                conflict = true;
                                break;
                            }
                        }
                        if (conflict) {
                            interval.start = interval.start.add(1, 'hours');
                            interval.end = calculateEndTime(interval.start, task.duration);
                        } else {
                            schedulable = true;
                            schedulableOnLine = true;
                            break;
                        }
                    }
                    if (schedulableOnLine) {
                        if (interval.start < earliestStartTime) {
                            earliestStartTime = interval.start;
                            bestLine = line;
                        }
                    }
                }
            }
        }      
        
        if (!schedulable) {
            errors.push(`Activity ${task.sku.name} (${task.goal.name}) cannot be scheduled on any line`);
            continue;  
        } else if (calculateEndTime(earliestStartTime, task.duration) > task.deadline) {
            console.log(calculateEndTime(earliestStartTime, task.duration).format());
            console.log(task.deadline.format());
            errors.push(`Activity ${task.sku.name} (${task.goal.name}) cannot be scheduled past deadline`);
            continue;
        } else {
            let mapping = new ManufacturingSchedule({
                activity: {
                    sku: task.sku._id,
                    manufacturing_goal: task.goal._id
                },
                manufacturing_line: bestLine,
                start_date: moment.utc(earliestStartTime).format(), 
                duration: task.duration, 
                duration_override: false,
                committed: false,
                user: getUser(req)
            });
            await ManufacturingSchedule.create(mapping);
        }
    }

    if (errors.length > 0) {
        console.log(errors);
        return res.json({
            success: true,
            message: errors
        });
    } else {
        return res.json({
            success: true,
            message: ["Automation of all activities successful"]
        });
    }
    
}

/**
 * Helper function to the naive algorithm which provides the priority queue implementation. The priority queue
 * uses a sorting mechanism dependent first on the deadline, and then on the duration of the activities.
 */
function makePriorityQueue() {
    return new PriorityQueue([], function(a, b) {
        if (a.deadline < b.deadline) {
            return -1;
        } else if (a.deadline > b.deadline) {
            return 1;
        } else {
            return a.duration - b.duration;
        }
    });
}

/**
 * The process activity function takes the raw activity submitted by the frontend, and extracts relevant info
 * that will be required to prioritize or deprioritize activities for the algorithm via the priority queue. 
 * The SKU and ManufacturingGoal are resolved, and then the duration is calculated so that automatic scheduling
 * can commence. The deadline is also extracted from the goal, so that it is easily accessible by the priority 
 * queue sorting mechanism.
 * 
 * @param {JSON} activity Raw data which contains two fields, the SKU number and the manufacturing goal name
 * 
 * @since Evolution 4, Requirement 4.4.13
 */
async function processActivity(activity) {
    let sku = await SKU.findOne({number: activity.sku}).exec();
    let goal = await ManufacturingGoal.findOne({name: activity.manufacturing_goal}).exec();
    let quantity = 0;
    for (let tuple of goal.sku_tuples) {
        if (tuple.sku.equals(sku._id)) {
            quantity = tuple.case_quantity;
        }
    }
    let duration = Math.ceil(quantity / sku.manufacturing_rate);
    return {
        sku: sku,
        goal: goal,
        duration: duration,
        deadline: moment(goal.deadline).tz('America/New_York').startOf('hour')
    };
}

function skipToWorkingHours(start, end, taskDuration) {
    start = moment(start)
    while (start.hours() < 8 || start.hours() >= 18) {
        start = start.add(1, 'hours');
        end = calculateEndTime(start, taskDuration);
    }
    return {
        start: start,
        end: end
    }
}

function calculateEndTime(start, duration) {
    let end = moment(start);
    var hoursToSixPM = 18 - start.hours();
    if (hoursToSixPM >= duration){
        end.add(duration, 'hours');
    } else {
        end.add(1, 'days');
        duration -= hoursToSixPM;
        while (duration > 10) {
            end.add(1, 'days');
            duration -= 10;
        }
        end.hours(8 + duration);
    }
    return end;
}

/****************************************************************************************************
 * COMPLEX ALGORITHM
 ****************************************************************************************************/

router.post('/complex', async(req, res) => {
    let { activities, start_, end_} = req.body;

    // Start and end date for autoscheduling
    let start = moment(start_).tz("America/New_York");
    let end = moment(end_).tz("America/New_York");

    // Setting up pyschedule periods for mapping activities to indices
    let periods, horizon, interval_start, interval_end;
    periods = mapTime(start, end);
    horizon = periods.length - 1;
    interval_start = periods[0];
    interval_end = periods[horizon];

    // Manufacturing lines the user has access to
    let user_manufacturing_lines = await getAccesibleManufacturingLines(req);

    // Console log the request for analysis purposes
    printAutoscheduleRequest(start, end, activities, periods, interval_start, interval_end, user_manufacturing_lines);

    // Add blocking activities
    let blocks = [];
    for (let user_manufacturing_line of user_manufacturing_lines) {
        let tasks = await ManufacturingSchedule.find({
            manufacturing_line: user_manufacturing_line,
            committed: true
        });
        for (let task of tasks) {
            let task_start = moment(task.start_date).tz("America/New_York");
            let task_end = calculateEndTime(task_start, task.duration);
            if (task_start < interval_end && task_end > interval_start) {
                let s = moment.max(task_start, interval_start);
                let e = moment.min(task_end, interval_end);
                let s_index = getIndex(s, periods);
                let e_index = getIndex(e, periods);
                let sku = await SKU.findOne({
                    _id: task.activity.sku
                });
                let goal = await ManufacturingGoal.findOne({
                    _id: task.activity.manufacturing_goal
                });
                console.log(task);
                blocks.push({
                    sku_number: sku.number,
                    goal_name: goal.name,
                    manufacturing_line_name: user_manufacturing_line.name,
                    start: s_index,
                    end: e_index
                });
            }
        }
    }

    // New activities to attempt to schedule
    let tasks = [];
    for (let activity of activities) {
        let processedActivity = await processActivity(activity);

        // Set intersection of user's controllable manufacturing lines and which lines the SKU can be produced on
        let usable_manufacturing_lines = [];
        for (let line of user_manufacturing_lines) {
            for (let id of processedActivity.sku.manufacturing_lines) {
                if (line.equals(id)) {
                    let t = await ManufacturingLine.findOne({_id: id});
                    usable_manufacturing_lines.push(t.name);
                }
            }
        }
        
        console.log(`The processed activity deadline is ${processedActivity.deadline.format()}`)

        let deadline_index = getDeadlineIndex(processedActivity.deadline, periods);
        tasks.push({
            sku_number: processedActivity.sku.number,
            goal_name: processedActivity.goal.name,
            duration: processedActivity.duration,
            manufacturing_line_names: usable_manufacturing_lines,
            deadline: deadline_index
        });
    }
    
    console.log(`The tasks to schedule are as follows: \n`);
    console.log(tasks);

    let axios_error, response;
    [axios_error, response] = await to(
        axios.post(
            'http://pyschedule:5000', 
            {
                blocks: blocks,
                tasks: tasks,
                horizon: horizon,
                manufacturing_lines: user_manufacturing_lines.map(line => line.name)
            }, 
            { 
                headers: {  
                    'mimetype': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        )
    );
    
    if (axios_error || !response.data.success) {
        console.log(`Python scheduler failed with message: ${response.data.message}`)
        return await automate_naive(req, res);
    } else {
        console.log(response.data.data);
        let scheduling_result = await transformSchedule(response.data.data, blocks, periods, req);
        if (scheduling_result.success) {
            return res.json(scheduling_result);
        } else {
            return await automate_naive(req, res);
        }
    }
});

async function transformSchedule(schedule, blocks, periods, req) {
    let mappings = [];

    for (let s of schedule) {
        if (s.task == 'MakeSpan') continue;

        let goal_name, sku_number, resource, start, end;
        goal_name = s.task.split("_")[0];
        sku_number = s.task.split("_")[1];
        resource = s.resource;
        start = periods[s.start];
        end = periods[s.end];

        // Do not schedule the blocks again (prescheduled activities used as constraints in pyschedule)
        let skip = false;
        for (let block of blocks) {
            if (goal_name.equals(block.goal_name) || sku_number.equals(block.sku_number)) {
                    skip = true;
                    break;
                }
        }
        if (skip) continue;

        if (!end) {
            return {
                success: false,
                message: ["Scheduler could not fit the activities and had overflow, must use naive method"]
            }
        }

        // Formally schedule
        let manufacturing_goal = await ManufacturingGoal.findOne({name: goal_name});
        let sku = await SKU.findOne({number: sku_number});
        let manufacturing_line = await ManufacturingLine.findOne({name: resource});

        let mapping = new ManufacturingSchedule({
            activity: {
                sku: sku._id,
                manufacturing_goal: manufacturing_goal._id
            },
            manufacturing_line: manufacturing_line._id,
            start_date: moment.utc(start).format(), 
            duration: s.end - s.start, 
            duration_override: false,
            committed: false,
            user: getUser(req)
        });
        mappings.push(mapping);
    }

    for (let mapping of mappings) {
        await ManufacturingSchedule.create(mapping);
    }

    return {
        success: true,
        message: ["Complex scheduling was successful"]
    }
}

function mapTime(start, end) {
    let a = moment(start);
    let b = moment(end);

    // Set start time to 8AM if it is 6PM-7AM
    if (a.hours() >= 18) {
        a.add(1, 'days').hours(8);
    } else if (a.hours() < 8) {
        a.hours(8);
    }

    // Set end time to 6PM if the end time is 7PM-8AM
    if (b.hours() > 18) {
        b.hours(18);
    } else if (b.hours() <= 8) {
        b.subtract(1, 'days').hours(18);
    }
    
    let list = [];
    while (a < b) {
        if (a.hours() == 18) {
            a.add(1, 'days').hours(8);
        }
        list.push(moment(a));
        a.add(1, 'hours');
    }
    list.push(moment(b));
    
    return list;
}

function getIndex(time, periods) {
    let index = 0;
    for (let period of periods) {
        if (period.isSame(time)) {
            return index;
        }
        index++;
    }
    return -1;
}

function getDeadlineIndex(deadline, periods) {
    let index = 0;
    for (let period of periods) {
        if (deadline <= period) {
            return index;
        }
        index++;
    }
    return index - 1;
}

/****************************************************************************************************
 * OTHER ROUTES / APIs
 ****************************************************************************************************/

router.post('/undo', async(req, res) => {
    let response = await ManufacturingSchedule.deleteMany({
        committed: false,
        user: getUser(req)
    });
    res.json({
        success: true,
        message: ["Removed autoscheduled activities that were not committed"]
    })
});

router.post('/commit', async(req, res) => {
    let errors = [];

    let activities = await ManufacturingSchedule.find({
        committed: false,
        user: getUser(req)
    });
    console.log(activities);

    for (let activity of activities) {
        let start = moment(activity.start_date).tz('America/New_York');
        let end = calculateEndTime(start, activity.duration);
        let committed_activities = await ManufacturingSchedule.find({
            committed: true,
            manufacturing_line: activity.manufacturing_line
        });
        console.log(committed_activities);
        let conflict = false;
        for (let committed_activity of committed_activities) {
            let committed_start = moment(committed_activity.start_date).tz('America/New_York');
            let committed_end = calculateEndTime(committed_start, committed_activity.duration);
            console.log(`The committed start is ${committed_start.format()} and the committed end is ${committed_end.format()}`);
            console.log(`The start is ${start.format()} and theend is ${end.format()}`);
            if (start < committed_end && end > committed_start) {
                console.log("How is this triggered");
                conflict = true;
                break;
            }
        }
        if (!conflict) {
            activity.committed = true;
            activity.user = undefined;
            activity.save();
        } else {
            errors.push('Some activities could not be scheduled');
        }
    }

    if (errors.length == 0) {
        res.json({
            success: true,
            message: ["Committed provisional activities to the manufacturing schedule"]
        });
    } else {
        res.json({
            success: false,
            message: errors
        })
    }
});

/****************************************************************************************************
 * GENERIC HELPERS
 ****************************************************************************************************/

function to(promise) {
    return promise.then(data => {
       return [null, data];
    })
    .catch(err => [err]);
}

/**
 * @TODO @Jesse This does not work
 */
async function getAccesibleManufacturingLines(req) {
    let user_model = await User.findOne({email: getUser(req)})
    let manufacturing_lines = user_model.admin ? await ManufacturingLine.find({}) : await ManufacturingLine.find({_id: {$in: user_model.plant_manager}});
    return manufacturing_lines;
}

function printAutoscheduleRequest(start, end, activities, periods, interval_start, interval_end, manufacturing_lines) {
    console.log(`The start date in EST is ${start.format()} and the end date in EST is ${end.format()}. \n`);
    console.log(`We are requested to schedule the following activities: \n`);
    console.log(activities);
    console.log(``);
    console.log(`The periods we are looking to schedule are as follows: \n`);
    for (let period of periods) {
        console.log(period.format());
    }
    console.log(``);
    console.log(`The interval start is ${interval_start.format()} and the interval end is ${interval_end.format()} \n`);
    console.log(`We have access to the following manufacturing lines: \n`);
    console.log(manufacturing_lines);
    console.log(``);
}

module.exports = router;