migration-to-0.4.0
===

This is the migration tool for HackMD to upgrade to version 0.4.0.  
Because we've dropped MongoDB from version 0.4.0.  
Use this tool if you were running a old version HackMD server.  
And have some old data need to transfer to new DB schemas.

Get started
---

1. Install node (at least 4.2), and run `npm install`.
2. You need to specify some settings in the file `config.js`.  
    - **old_db_mongodb**: old MongoDB connection string.
    - **old_db_postgresql**: old PostgreSQL connection string.
    - **new_db**: new DB connect settings, [see more here](http://sequelize.readthedocs.org/en/latest/api/sequelize/)
3. run the `app.js` as you like (in most case `node app.js` is enough)
4. Wait for migration, will take more time if you have large amount of data.
5. Complete!
