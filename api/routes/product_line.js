const express = require('express');
const router = express.Router();
const ProductLine = require('../model/product_line_model');
const SKU = require('../model/sku_model');
const pagination = require('../controllers/paginate');
const validator = require('../controllers/validator');


//Create
router.post('/create', (req, res) => {
    const {name} = req.body;


    let product_line = new ProductLine({name});
    ProductLine.createProductLine(product_line, (err) => {
        if(err){
            res.json({success: false, message: `Failed to create product line. Error: ${err}`});
        }else{
            res.json({success: true, message: "Created successfully"});
        }
    });
});

//Read
router.post('/read', async (req, res) => {
    const {pageNum}  = req.body;


    let agg = ProductLine.aggregate({$match: {}});

    let results = await pagination.paginate(agg, pageNum, 'name');
    res.json(results);
});

//Update
router.post('/update', (req, res) => {
    const { name, newname } = req.body;


    var json = {};

    if (newname) {
        json["name"] = newname;
    }

    ProductLine.updateProductLine(name, json, async (error) => {
        if (error) {
            res.json({success: false, message: `Failed to update product line. Error: ${error}`});
        } else {
            await SKU.update({product_line: name}, {product_line: newname}, {multi: true}).exec();
            res.json({success: true, message: "Updated successfully."});
        }
    });
});

//Delete
router.post('/delete', async (req, res) => {
    const {name} = req.body;

    let line = await ProductLine.findOne({name: name}).exec();
    let line_passed = await validator.productLineClear(line._id);

    if(!line_passed[0]){
        res.json({success: false, message: line_passed[1]});
        return;
    }

    ProductLine.deleteProductLine(name, (err, result) => {
        if(err) {
            res.json({success: false, message: `Failed to delete product line. Error: ${err}`});

        }else if(result.deletedCount == 0){
            res.json({success: false, message: 'Product Line does not exist to delete'});
        }else{
            res.json({success: true, message: "Deleted successfully."});
        }
    })
});
module.exports = router;