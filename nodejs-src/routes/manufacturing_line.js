const express = require('express');
const router = express.Router();
const ManufacturingLine = require('../model/manufacturing_line_model');
const SKU = require('../model/sku_model');
const pagination = require('../controllers/paginate');
const validator = require('../controllers/validator');
const autocomplete = require('../controllers/autocomplete');
const ManufacturingSchedule = require('../model/manufacturing_schedule_model');


router.post('/autocomplete', async (req, res) => {
    console.log('jo');
    const { input } = req.body;

    let results = await autocomplete.nameOrNumber(ManufacturingLine, input);
    res.json({success: true, data: results});
});

router.post('/all', async (req, res) => {
    const { pageNum, sortBy, page_size } = req.body;

    let agg = ManufacturingLine.aggregate([{$match: {}}]);
    let results = await pagination.paginate(agg, pageNum, sortBy, page_size);
    res.json(results);
});

router.post('/create', (req, res) => {
    const {name, shortname, comment } = req.body;

    let name_passed = validator.proper_name_length(name);
    let shortname_passed = validator.proper_shortname_length(shortname);

    let errors = validator.compileErrors(name_passed, shortname_passed);

    if(errors.length > 0){
        res.json({success: false, message: errors});
    }

    let line = new ManufacturingLine({name, shortname, comment});
    ManufacturingLine.create(line, (err) => {
        if (err) {
            res.json({success: false, message: `Failed to create a new manufacturing line. Error: ${err}`});
        } else{
            res.json({success: true, message: "Added successfully."});
        }
    });
});


router.post('/update', (req, res) => {
    const { name, shortname, newshortname, comment} = req.body;

    let json = {};

    if(name != undefined && name != NaN){
        let name_passed = validator.proper_name_length(name);
        if(!name_passed[0]){
            res.json({success: false, message: name_passed[1]});
            return;
        }
        json["name"] = name;
    }
    if(newshortname != undefined && newshortname != NaN){
        let shortname_passed = validator.proper_shortname_length(newshortname);
        if(!shortname_passed[0]){
            res.json({success: false, message: shortname_passed[1]});
            return;
        }
        json["shortname"] = newshortname;
    }
    if(comment != undefined && comment != NaN){
        json["comment"] = comment;
    }

    ManufacturingLine.findOneAndUpdate({shortname: shortname}, json, (err) => {
        if (err) {
            res.json({success: false, message: `Failed to update manufacturing line. Error: ${err}`});
        } else {
            res.json({success: true, message: "Updated successfully."});
        }
    })
});

router.post('/delete', async (req, res) => {
    const { shortname } = req.body;

    let line = await ManufacturingLine.findOne({shortname: shortname}).exec();

    ManufacturingLine.deleteOne({shortname: shortname}, async (err, result) => {
        if(err) {
            res.json({success: false, message: `Failed to delete manufacutring line. Error: ${err}`});
        }else if(!result || result.deletedCount == 0){
            res.json({success: false, message: 'Manufacturing line does not exist to delete'});
        }else{
            //delete from skus
            await SKU.updateMany({manufacturing_lines: line._id}, {$pull: {manufacturing_lines: line._id}}).exec();
            //delete schedule mapping
            await ManufacturingSchedule.deleteMany({manufacturing_line: line._id}).exec();
            res.json({success: true, message: "Deleted successfully."});
        }
    });
});

module.exports = router;
