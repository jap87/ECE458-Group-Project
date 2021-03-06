# Deployment Guide
Read INSTALL.MD. Walk through the script step by step for easy deployment. You need 2 Duke-provisioned VCMs, one for production and one for backup.

As of evolution 4, our production server lives at https://vcm-9470.vm.duke.edu:4200 and our backup server lives at https://vcm-8793.vm.duke.edu.

The passwords are hubut6anGr and 6yTefrigao respectively.

# Backup Guide
Read BACKUP.MD for an understanding of how the backups and restore are done or can be handled by the system administrator.

# Development Guide
## Technologies/Frameworks
Our app was built using the MEAN stack, meaning MongoDB for storage, Express for handling http requests, Angular for front end design, and Node for backend design.

## Configure
To set up a development environment, run ```npm start``` in the main directory and navigate to ```https://localhost:3000``` in your browser of choice.

## API
Our API consists of 7 main routes: users, upload, export, skus, ingredients, product_lines, and manufacturing_goals.

### Users
#### Register a user
* Allows the admin to create a new user.  
**URL**: ```POST / api/users/register```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the user. | String |    
| email | **Required**. The email for the user. | String |    
| password | **Required**. The password of the user. | String |      
| password2 | **Required**. The password verification for the user. | String |      
| admin | **Optional**. First time registration will set as admin. | Boolean |    

#### Login a user
* Allows a user to login.  
**URL**: ```POST / api/users/login```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------      
| email | **Required**. The email for the user. | String |    
| password | **Required**. The password of the user. | String |     

### Upload
#### Create an upload sessions
* Allows a user to import a file. If errors or no collisions, will finish. Otherwise need to use commit.  
**URL**: ```POST / api/upload/```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------      
| files | **Required**. List of files to import. | List |    

#### Commit changes
* Allows a user to commit changes.  
**URL**: ```POST / api/upload/commit```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------      
| commit | **Required**. Boolean that determines whether to commit. | Boolean |   

### Export
#### Export ingredients
* Allows the user to export ingredients after filtering by keyword and with assisted selection on SKUs.  
**URL**: ```POST /api/export/ingredients```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| sortBy | **Required**. The field to sort by. | String |       
| keywords | **Required**. List of keywords to filter by. | List |      
| skus | **Required**. List of skus to filter by. | List |     

#### Export SKUs
* Allows the user to export SKUs after filtering by keyword and with assisted selection on ingredients and product lines.  
**URL**: ```POST /api/export/skus```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| sortBy | **Required**. The field to sort by. | String |     
| keywords | **Required**. List of keywords to filter by. | List |      
| ingredients | **Required**. List of ingredients to filter by. | List |      
| product_lines | **Required**. List of product lines to filter by. | List |  

#### Export Product Lines
* Allows the user to export product linese.  
**URL**: ```POST /api/export/product_lines```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    

#### Export Formulas
* Allows the user to export formulas after filtering SKUs by keyword and with assisted selection on ingredients and product lines.  
**URL**: ```POST /api/export/formulas```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| sortBy | **Required**. The field to sort by. | String |     
| keywords | **Required**. List of keywords to filter by. | List |      
| ingredients | **Required**. List of ingredients to filter by. | List |      
| product_lines | **Required**. List of product lines to filter by. | List |  

### SKUS
#### Filter SKUs
* Allows the user to filter SKUs by keyword and with assisted selection on ingredients and product lines.  
**URL**: ```POST /api/skus/filter```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| sortBy | **Required**. The field to sort by. | String |    
| pageNum | **Required**. The page of the results you want to view. | Number |    
| keywords | **Required**. List of keywords to filter by. | List |      
| ingredients | **Required**. List of ingredients to filter by. | List |      
| product_lines | **Required**. List of product lines to filter by. | List |    

#### Create SKU
* Allows the user to create a new SKU.  
**URL**: ```POST / api/skus/create```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the SKU. | String |    
| number | **Optional**. The SKU number, autogenerated if not filled in. | Number |    
| case_upc | **Required**. The SKU Case UPC number. | String |      
| unit_upc | **Required**. The SKU Unit UPC number. | String |      
| size | **Required**. The SKU unit size. | String |    
| count | **Required**. The SKU count per case. | Number |    
| product_line | **Required**. The product line the SKU belongs to. | String |    
| ingredients | **Required**. List of ingredients and quantities contained in the SKU. | List |      
| comment | **Optional**. Comment about the SKU. | String |    

#### Update SKU
* Allows the user to update an existing SKU. When updating a SKU that exists in a manufacturing goal, the changes will propagate to that goal.  
**URL**: ```POST / api/skus/update```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Optional**. The new name of the SKU. | String |    
| number | **Required**. The SKU number used to find the right SKU to update. | Number |
| newnumber | **Optional**. The new SKU number. | Number | 
| case_upc | **Optional**. The new SKU Case UPC number. | String |      
| unit_upc | **Optional**. The new SKU Unit UPC number. | String |      
| size | **Optional**. The new SKU unit size. | String |    
| count | **Optional**. The new SKU count per case. | Number |    
| product_line | **Optional**. The new product line the SKU belongs to. | String |    
| ingredients | **Optional**. The new list of ingredients and quantities contained in the SKU. | List |      
| comment | **Optional**. The new comment about the SKU. | String |  

#### Delete SKU
* Allows the user to delete an existing SKU. When deleting a SKU that exists in a manufacturing goal, the SKU will be removed from that goal.  
**URL**: ```POST / api/skus/delete```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------       
| number | **Required**. The SKU number used to find the right SKU to delete. | integer |    

### Ingredients
#### Filter Ingredients
* Allows the user to filter ingredients by keyword and with assisted selection on SKUs.  
**URL**: ```POST /api/ingredients/filter```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| sortBy | **Required**. The field to sort by. | String |    
| pageNum | **Required**. The page of the results you want to view. | Number |    
| keywords | **Required**. List of keywords to filter by. | List |      
| skus | **Required**. List of skus to filter by. | List |      

#### Create Ingredient
* Allows the user to create a new ingredient.  
**URL**: ```POST / api/ingredients/create```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the ingredient. | String |    
| number | **Optional**. The ingredient number, autogenerated if not filled in. | Number |    
| vendor_info | **Optional**. Information about the vendor. | String |      
| package_size | **Required**. The size of the ingredient package. | String |      
| cost | **Required**. The cost of the ingredient. | Number |    
| comment | **Optional**. Comment about the ingredient. | String |    

#### Update Ingredient
* Allows the user to update an existing ingredient. When updating an ingredient that exists in a SKU, the changes will be propagated to that SKU.  
**URL**: ```POST / api/ingredients/update```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name used to find the right ingredient to update. | String |    
| newname | **Optional**. The new name of the ingredient. | String |
| number | **Optional**. The new ingredient number. | Number |    
| vendor_info | **Optional**. New information about the vendor. | String |      
| package_size | **Optional**. The new size of the ingredient package. | String |      
| cost | **Optional**. The  new cost of the ingredient. | Number |    
| comment | **Optional**. The new comment about the ingredient. | String |   

#### Delete Ingredient
* Allows the user to delete an existing ingredient. When deleting an ingredient that exists in a SKU, the ingredient will be removed from that SKU.  
**URL**: ```POST / api/ingredients/delete```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name used to find the right ingredient to delete. | String |    

### Product Lines
#### Create Product Line
* Allows the user to create a new product line.  
**URL**: ```POST / api/product_lines/create```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the product line. | String |    
  
#### Read Product Lines
* Allows the user to view all product lines in the database.  
**URL**: ```POST /api/product_lines/read```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| pageNum | **Required**. The page of the results you want to view. | Number |    

#### Update Product Lines
* Allows the user to update an existing product line. When updating a product line that exists in a SKU, the change will be propagated to the SKU.  
**URL**: ```POST /api/product_lines/update```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the product line used to find the product line to update. | String |  
| newname | **Required**. The new name of the product line. | String |  

#### Delete Product Lines
* Allows the user to delete an existing product line. Users will not be able to delete a product line if a SKU is a part of that line.  
**URL**: ```POST /api/product_lines/delete```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the product line used to find the product line to delete. | String |  

### Manufacturing Goals
#### Create Manufacturing Goal
* Allows the user to create a new manufacturing goal.  
**URL**: ```POST / api/manufacturing_goals/create```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the product line. | String |    
| skus | **Required**. The list of SKUs and quantities to be added to the goal. | List |    

#### Read Manufacturing Goals
* Allows the user to view all manufacturing goals in the database.  
**URL**: ```POST /api/manufacturing_goals/all```

**Parameters**:

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| pageNum | **Required**. The page of the results you want to view. | String |    
| sortBy | **Required**. The field of the results you want to sort by. | String |  
| user | **Required**. The user for which goals you want to view. | String | 

#### Delete Manufacturing Goal
* Allows the user to delete an existing manufacturing goal.  
**URL**: ```POST / api/manufacturing_goals/delete```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the manufacturing goal to delete. | String |    

#### Calculate Manufacturing Goal
* Allows the user to calculate an existing manufacturing goal.  
**URL**: ```POST / api/manufacturing_goals/calculator```

**Parameters**

| Parameter | Description | Type |    
| ----------- | ----------- |---------    
| name | **Required**. The name of the manufacturing goal to calculate. | String |  


