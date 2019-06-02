const AWS = require("aws-sdk");
const config = require("./config/config.js");
const rateLimit = require("express-rate-limit");
const isDev = process.env.NODE_ENV !== 'production';
const uuidv1 = require('uuid/v1');

var express = require("express");
const sls = require('serverless-http');
var bodyParser = require('body-parser')
var cors = require('cors')

var app = express();

app.use(cors())

app.enable("trust proxy");
app.use(bodyParser.json());

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

app.get("/api/todos", (req, res, next) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
    } 
    else {
        AWS.config.update(config.aws_remote_config);
    }

    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: config.aws_table_name,
        KeyConditionExpression: 'timestamp > 0',
        ScanIndexForward:true
    };
    docClient.scan(params, function(err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        } 
        else {
            const { Items } = data;
            res.send({
                success: true,
                message: 'Loaded todos',
                todos: Items
            });
        }
    });
});

app.get("/api/todo", (req, res, next) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
    }
    else {
        AWS.config.update(config.aws_remote_config);
    }

    const todoID = req.query.id;
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: config.aws_table_name,
        KeyConditionExpression: 'todoID = :i',
        ExpressionAttributeValues: {
            ':i': todoID
        }
    }

    docClient.query(params, function(err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        }
        else {
            const { Items } = data;

            res.send({
                success: true,
                message: "Loaded todos",
                todo: Items
            });
        }
    });
});

app.post('/api/todo', (req, res, next) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
    } 
    else {
        AWS.config.update(config.aws_remote_config);
    }

    const { message } = req.body;

    // Not actually unique, but should suffice for this use case
    const todoID = uuidv1();

    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: config.aws_table_name,
        Item: {
            todoID: todoID,
            timestamp: +new Date,
            message: message
        }
    };
    docClient.put(params, function(err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        }
        else {
            res.send({
                success: true,
                message: 'Added todo',
                todoID: todoID
            });
        }
    });
});

app.delete("/api/todo", (req, res, next) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
    }
    else {
        AWS.config.update(config.aws_remote_config);
    }

    const todoID = req.query.todoID;
    const timestamp = req.query.timestamp;

    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: config.aws_table_name,
        Key: {
            "todoID":todoID,
            "timestamp":Number(timestamp)
        }
    }

    docClient.delete(params, function(err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        }
        else {
            res.send({
                success: true,
                message: 'Deleted todo',
                todoID: todoID
            });
        }
    });
})

module.exports.server = sls(app);