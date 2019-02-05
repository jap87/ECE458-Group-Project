const express = require('express');
const router = express.Router();
const ProductLine = require('../model/product_line_model');
const pagination = require('../controllers/paginate');

//Create
router.post('/create', (req, res) => {
    const name = req.body.name;
    //check required fields
    if(!name){
        res.json({success: false, message: 'Please fill in all fields'});
        return;
    }

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
router.post('/read', (req, res) => {
    const pageNum  = req.body.pageNum;

    let filter = ProductLine.find({});
    pagination.paginate(filter, ProductLine, pageNum, 'name', res);
});

//Update
router.post('/update', (req, res) => {
    const { name, newname } = req.body;

    var json = {};

    if (newname) {
        json["name"] = newname;
    }

    ProductLine.updateProductLine(name, json, (error) => {
        if (error) {
            res.json({success: false, message: `Failed to update product line. Error: ${error}`});
        } else {
            res.json({success: true, message: "Updated successfully."});
        }
    });
});

//Delete
router.post('/delete', (req, res) => {
    const name = req.body.name;

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