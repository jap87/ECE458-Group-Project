const express = require('express');
const router = express.Router();

const SKU = require('../model/sku_model');
const ManufacturingGoal = require('../model/manufacturing_goal_model');
const ManufacturingSchedule = require('../model/manufacturing_schedule_model');
const Ingredient = require('../model/ingredient_model');
const Formula = require('../model/formula_model');
const pagination = require('../controllers/paginate');
const validator = require('../controllers/validator');
const unit = require('../controllers/units');
const utils = require('../utils/utils');
const manufacturing_goal_filter = require('../controllers/manufacturing_goal_filter');
const jwtDecode = require('jwt-decode');

function getUser(req){
    let jwt = req.headers.authorization
    let payload = jwt.split(' ')[1]
    let decoded = jwtDecode(payload)

    return decoded.email;  
}

router.post('/calculator', async (req, res) => {
    const { name } = req.body;


    let user = getUser(req);
    if(!user){
        res.json({success: false, message: 'No user logged in'});
        return;
    }

    let ingredientMap = {}

    let goal = await ManufacturingGoal.findOne({name: name}).exec();

    for(let sku_tuple of goal.sku_tuples){
        let sku = await SKU.findOne({_id: sku_tuple.sku}).exec();
        let formula = await Formula.findOne({_id: sku.formula}).exec();

        for(let ingr_tuple of formula.ingredient_tuples){
            // let key = ingr_tuple.ingredient; //maybe use id as key
            let ingredient = await Ingredient.findOne({_id: ingr_tuple.ingredient}).exec();
            let key = ingredient.name;

            let unit_value = sku_tuple.case_quantity * sku.formula_scale_factor * ingr_tuple.quantity * unit.convert(ingr_tuple.unit, ingredient.unit); // goal case quantity * sku scale factor * formula quantity * conversion

            console.log("scale factor: "+sku.formula_scale_factor)
            console.log("formula unit: "+ingr_tuple.unit+" formula amount: "+ingr_tuple.quantity)
            console.log("ingredient unit: "+ingredient.unit)
            console.log("conversion: "+unit.convert(ingr_tuple.unit, ingredient.unit))

            // If ingredient already in map, update values
            if(key in ingredientMap){
                ingredientMap[key]['unit_value'] += unit_value;
                ingredientMap[key]['package_value'] = ingredientMap[key]['unit_value'] / ingredient.package_size;
            }else{
                ingredientMap[key] = {};
                ingredientMap[key]['unit_value'] = unit_value;
                ingredientMap[key]['unit'] = ingredient.unit;
                ingredientMap[key]['package_value'] = unit_value / ingredient.package_size;
                ingredientMap[key]['number'] = ingredient.number;
            }
        }
    }

    res.json({success: true, data: ingredientMap});
});

router.post('/get_enabled', async (req, res) => {
    let get_enabled = true;

    let results = await manufacturing_goal_filter.filter(-1, 'name', 0, get_enabled);
    res.json(results);
});

router.post('/set_enabled', (req, res) => {
    const {manufacturing_goal, enabled} = req.body;
    ManufacturingGoal.findOneAndUpdate({name: manufacturing_goal.name}, {enabled: enabled}, (err) => {
        if(err){
            res.json({success: false, message: 'Set enabled failed: ' + err});
        }else{
            res.json({success: true, message: 'Set enabled successful'});
        }
    })
})

// Get all
router.post('/all', async (req, res) => {
    const { pageNum, sortBy, page_size } = req.body;
    
	let user = getUser(req);
    if(!user){
        res.json({success: false, message: 'No user logged in'});
        return;
    }

    let results = await manufacturing_goal_filter.filter(pageNum, sortBy, page_size);
    res.json(results);
});

// CREATE
router.post('/create', async (req, res) => {
    const { name, sku_tuples, deadline } = req.body;

    // Check that SKUS exist
    let valid_tuples = [];
    for(let tuple of sku_tuples){
        valid_tuples.push(await validator.itemExists(SKU, tuple.sku.number.toString()));
    }

    let errors = validator.compileErrors(...valid_tuples);
    // Return errors if any
    if(errors.length > 0){
        res.json({success: false, message: errors});
        return;
    }

    // Change from sku name to id
    for(let i = 0; i < valid_tuples.length; i++){
        sku_tuples[i]['sku'] = valid_tuples[i][2]; //id of sku
    }

    let user = getUser(req);
    if(!user){
        res.json({success: false, message: 'No user logged in'});
        return;
    }

    //TODO: replace with validator
    let deadline_date = new Date(deadline);
    if(isNaN(deadline_date)){
        res.json({success: false, message: deadline_date}); //message is: invalid date
        return;
    }

    let last_edit = new Date();   

    createManufacturingGoal(name, sku_tuples, deadline_date, user, last_edit, res);    

});

function createManufacturingGoal(name, sku_tuples, deadline, author, last_edit, res){
    let goal = new ManufacturingGoal({name, sku_tuples, deadline, author, last_edit});
    
    ManufacturingGoal.create(goal, (error) => {
        if (error) {
            res.json({success: false, message: `Failed to create a new manufacturing goal. Error: ${error}`});
        } else{
            res.json({success: true, message: "Added successfully."});
        }
    });
}

//UPDATE
router.post('/update', async (req, res) => {
    const { name, newname, sku_tuples, deadline } = req.body;
    
    let json = {};
    if(newname != undefined && newname != NaN){
        json["name"] = newname;
    }
    if(sku_tuples != undefined && sku_tuples != NaN){
        // Check that SKUS exist
        let valid_tuples = [];
        for(let tuple of sku_tuples){
            valid_tuples.push(await validator.itemExists(SKU, tuple.sku.number.toString()));
        }

        let errors = validator.compileErrors(...valid_tuples);
        // Return errors if any
        if(errors.length > 0){
            res.json({success: false, message: errors});
            return;
        }
        // Change from sku name to id
        for(let i = 0; i < valid_tuples.length; i++){
            sku_tuples[i]['sku'] = valid_tuples[i][2]; //id of sku
        }
        json["sku_tuples"] = sku_tuples;
    }
    if(deadline != undefined && deadline != NaN){
        let deadline_date = new Date(deadline);
        if(isNaN(deadline_date)){
            res.json({success: false, message: deadline_date}); //message is: invalid date
            return;
        }
        json["deadline"] = deadline_date;
    }
    json["last_edit"] = new Date()
    
    ManufacturingGoal.findOneAndUpdate({name: name}, json, {new: true}, (err) => {
        if (err) {
            res.json({success: false, message: `Failed to update manufacturing goal. Error: ${err}`});
        } else {
            res.json({success: true, message: "Updated successfully."});
        }
    })
})

//DELETE
router.post('/delete', async (req, res) => {
    const { name } = req.body;
    let goal = await ManufacturingGoal.findOne({name: name}).exec();
    
    ManufacturingGoal.deleteOne({name: name}, async (err, result) => {
        if(err) {
            res.json({success: false, message: `Failed to delete manufacturing goal. Error: ${err}`});
        }else if(result.deletedCount == 0){
            res.json({success: false, message: 'Manufacturing goal does not exist to delete'});
        }else{
            //delete mappings with this sku as well
            await ManufacturingSchedule.deleteMany({'activity.manufacturing_goal': goal._id}).exec();
            res.json({success: true, message: "Deleted successfully."});
        }
    });
});

module.exports = router;
