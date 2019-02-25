const SKU = require('../model/sku_model');
const ManufacturingGoal = require('../model/manufacturing_goal_model');
const util = require('../../utils/utils');

module.exports.compileErrors = function(){
    let errors = [];
    for(let arg of arguments){
        //arg[0] contains the boolean value of iff the test passed
        if(!arg[0]){
            //arg[1] contains the error messages
            errors = errors.concat(arg[1]);
        }
    }
    return errors;
}

module.exports.validActivity = async function(activity){
    let err_msg;
    let sku = await SKU.findOne({number: activity.sku}).exec();
    let goal = await ManufacturingGoal.findOne({name: activity.manufacturing_goal}).exec();

    if(!sku){
        err_msg = `SKU ${activity.sku} doesn't exist`;
        return [false, err_msg];
    }
    if(!goal){
        err_msg = `Manufacturing goal ${activity.manufacturing_goal} doesn't exist`;
        return [false, err_msg];
    }
    let valid = false;
    err_msg = 'Invalid activity';
    for(let tuple of goal.sku_tuples){
        if(tuple.sku.equals(sku._id)){
            valid = true;
        }
    }
    return [valid, err_msg, sku._id, goal._id];
}

// Dependency checks
module.exports.itemExists = async function(model, item) {
    let result = await model.findOne({$or: [{name: item}, {number: item}, {shortname: item}]}).exec();    
    let err_msg = `${model.modelName} doesn't exist`;

    if(!result){
        return [!(!result), err_msg];
    }else{
        return [!(!result), err_msg, result._id];
    }   
}

module.exports.inputsExist = function(params){
    let errors = [];
    for(let key of Object.keys(params)){
        if(!params[key]){
            errors.push(`Please fill in ${key}`);
        }
    }

    return [errors.length == 0, errors];
}

module.exports.objectFieldsExist = function(obj, requiredFields){
    let errors = [];
    for(let field of requiredFields){
        if(!(field in obj)){
            errors.push(`Please fill in ${field}`);
        }
    }

    return [errors.length == 0, errors];
}


module.exports.proper_name_length = function(name){
    let err_msg = 'Name must be 32 characters or fewer';
    return [name.length <= 32, err_msg];
}

module.exports.proper_shortname_length = function(shortname){
    let err_msg = 'Shortname must be 5 characters or fewer';
    return [shortname.length <= 5, err_msg];
}

module.exports.isPositive = function(number, field){
    let err_msg = `${field} must be positive`;
    return [number >= 0, err_msg];
}

module.exports.roundCost = function(cost){
    return (isNaN(cost)) ? cost : Number(cost).toFixed(2); //makes sure that toFixed is not called on strings
}

module.exports.forceInteger = function(number){
    return parseInt(number);
}

//is product line in use by a sku
module.exports.productLineClear = async function(id) {
    let err_msg = `Product Line is in use`;
    let result = await SKU.findOne({product_line: id}).exec();
    return [!result, err_msg]; //if clear then there will be no result, thus !result will be true
};

module.exports.validDate = function(date){
    let err_msg = 'Invalid date';
    let dateobj = new Date(date);

    return [isNaN(dateobj), err_msg, dateobj];
}

module.exports.isNumeric = function(number){
    let err_msg = `${number} is not numeric`;
    return [!isNaN(number), err_msg];
}

function getProperties(model){
    let unique_keys = {};
    let properties = [];
    for(let field of Object.keys(model.schema.obj)){
        if(field.unique){
            unique_keys[field] = field;
        }
        properties.push(field);
    }
    return [unique_keys, properties]
}

//Only for ingredients, skus, and product_lines
module.exports.conflictCheck = async function(model, data, data_csv, results, type){
    let [unique_keys, properties] = getProperties(model);

    for(let [row, row_csv] of utils.zip(data, data_csv)){
        let primary_key = getPrimaryKey(model)
        let primary_match = await model.findOne({[primary_key]: row[primary_key]}).exec();

        let matches = [];
        for(let key in Object.keys(unique_keys)){
            matches = matches.concat(await model.find({[key]: row[key]}));
        }
        
        if(matches.length > 1){
            results[type].errorlist.push({
                message: 'Ambiguous record',
                data: row_csv
            });
        }else if(matches.length == 1){
            if(!matches[0].equals(primary_match)){
                results[type].errorlist.push({
                    message: 'Ambiguous record',
                    data: row_csv
                });
            }
        }else if(primary_match){
            //check identical
            let identical = true;
            for(let property of properties){
                identical = identical && row[property] == primary_match[property]
            }
            
            //If row is identical to something in db, ignore
            if(identical){
                results[type].ignorelist.push(row_csv);
            }else{
                results[type].changelist.push(row_csv);
                results[type].changelist_model.push(row);
            }

        }else{
            results[type].createlist.push(row_csv);
            results[type].createlist_model.push(row);
        }
    }
}

function getPrimaryKey(model){
    if(model.name == 'ProductLine'){
        return 'name';
    }
    return 'number';
}

module.exports.duplicateCheck = (model, data, data_csv, results, type) => {
    let unique_key_sets = {}
    let [unique_keys, properties] = getProperties(model)
    //create a set for every unique key to check for duplicates
    for(let key of Object.keys(unique_keys)){
        unique_key_sets[key] = new Set();
    }

    for(let [row, row_csv] of utils.zip(data, data_csv)){
        for(let field of Object.keys(unique_key_sets)){
            if(unique_key_sets[field].has(row[field])){
                results[type].errorlist.push({
                    message: 'Duplicate row in SKUs',
                    data: row_csv
                });
                return;
            }else{
                unique_key_sets[field].add(row[field]);
            }
        }
    }
}