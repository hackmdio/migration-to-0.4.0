migration-to-0.4.0
===

This is the migration tool for HackMD to version 0.4.0.  
Only need to use when you were running a HackMD server version below 0.4.0.

Because we've dropped MongoDB from version 0.4.0.  
So you will need this to migrate old data to new DB schema.

Get Started
---
Change the settings in the file `config.js`.  
You need to specify the old MongoDB and old PostgreSQL connections.  
Also the new DB connection settings (you can use the same or different DB).  
