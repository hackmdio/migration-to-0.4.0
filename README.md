migration-to-0.4.0
===

This is the migration tool for HackMD to version 0.4.0.  
Because we've dropped MongoDB from version 0.4.0.  
Use this tool to migrate old data to new DB schemas.

Get started
---

1. You need to specify some settings in the file `config.js`.  
    - **old_db_mongodb**: old MongoDB connection string.
    - **old_db_postgresql**: old PostgreSQL connection string.
    - **new_db**: new DB connect settings, [see more here](http://sequelize.readthedocs.org/en/latest/api/sequelize/)
2. run the `app.js` by `node app.js`
3. Wait for migration, will take more time if you have large amount of data.
4. Complete!
