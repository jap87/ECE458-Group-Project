const appender = require('./append_skus');

let limit = 10;

module.exports.paginate = function (filter, model, pageNum, sortBy, res){
    let newFilter
    if(pageNum == -1){
        newFilter = filter.collation({locale: 'en'}).sort(sortBy).lean();
    }else{
        newFilter = filter.skip((pageNum-1)*limit).collation({locale: 'en'}).sort(sortBy).lean();
    }
    newFilter.exec(async (err, results) => {
        if(err){
            res.json({success: false, message: err});
        }else{
            let pages = Math.ceil(results.length/limit) + (pageNum-1);
            let slice = Math.min(limit, results.length);

            if(model.modelName === 'Ingredient'){
                let data = results.slice(0, slice);
                for(let ingredient of data){
                    ingredient.cost = ingredient.cost.toFixed(2);
                }

                appender.append(data, pages, res);
            }else{
                res.json({
                    success: true,
                    data: results.slice(0, slice),
                    pages: pages
                });
            }           
        }       
    });   
}


