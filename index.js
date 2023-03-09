// Lib Imports
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Joi = require("joi");
const { ValidationError } = require("joi");
Joi.objectId = require("joi-objectid")(Joi);

// mongoose related imports
const TaskModel = require("./models/task.model");
mongoose.connection.on("open", () => {
    console.log("Connected to todo db");
});
const connection = mongoose.connect(
    process.env.MONGO_URL || "mongodb://127.0.0.1:27017/todo"
);

// Custom modules
const { ERRORS } = require("./constants");

// express middlewares start here
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Test Route
app.get("/", (req, res) => {
    return res.status(200).send({ message: "Hello World" });
});

// CRUD routes for tasks
app.get("/api/tasks", async (req, res) => {
    const { error, value } = Joi.object({
        limit: Joi.number().integer().default(50),
        skip: Joi.number().integer().default(0),
    }).validate(req.query);
    if (error) return next(error);

    try {
        const [data, count] = await Promise.all([
            TaskModel.find({})
                .skip(value.skip)
                .limit(value.limit)
                .lean()
                .exec(),
            TaskModel.countDocuments({}),
        ]);
        return res.status(200).send({ data, count });
    } catch (error) {
        return next(error);
    }
});

app.get("/api/tasks/:id", async (req, res) => {
    const { error, value } = Joi.object({
        id: Joi.objectId().required(),
    }).validate(req.params);
    if (error) return next(error);

    try {
        const task = await TaskModel.findOne({ _id: value.id }).lean().exec();
        if (!task) {
            return res
                .status(404)
                .send({ code: 404, message: ERRORS.NOT_FOUND });
        }
        return res.status(200).send(task);
    } catch (error) {
        return next(error);
    }
});

app.post("/api/tasks", async (req, res) => {
    const { error, value } = Joi.object({
        title: Joi.string().required(),
        isCompleted: Joi.boolean().default(false),
    }).validate(req.body);
    if (error) return next(error);

    try {
        const newTask = new TaskModel(value);
        const task = await newTask.save();
        return res.status(200).send(task);
    } catch (error) {
        return next(error);
    }
});

app.patch("/api/tasks/:id", async (req, res) => {
    const { error, value } = Joi.object({
        id: Joi.objectId().required(),
        title: Joi.string(),
        isCompleted: Joi.boolean(),
    }).validate({ ...req.body, ...req.params });
    if (error) return next(error);

    try {
        const task = await TaskModel.findOne({ _id: value.id }).lean().exec();
        if (!task) {
            return res
                .status(404)
                .send({ code: 404, message: ERRORS.NOT_FOUND });
        }

        const updatedTask = await TaskModel.findOneAndUpdate(
            { _id: value.id },
            req.body,
            {
                new: true,
            }
        );

        return res.status(200).send(updatedTask);
    } catch (error) {
        return next(error);
    }
});

app.delete("/api/tasks/:id", async (req, res) => {
    const { error, value } = Joi.object({
        id: Joi.objectId().required(),
    }).validate(req.params);
    if (error) return next(error);

    try {
        await TaskModel.deleteOne({ _id: value.id });
        return res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
});

// Error handler
app.use((req, res, next, error) => {
    if (error instanceof ValidationError) {
        return res
            .status(400)
            .send({ code: 400, message: error.details[0].message });
    }

    console.log(error);

    return res.status(500).send({
        code: 500,
        message: ERRORS.UNKNOWN,
    });
});

// 404 Handler
app.use((req, res, next) => {
    return res.status(404).send({ code: 404, message: ERRORS.NOT_FOUND });
});

const PORT = process.env.PORT || 3000;
(async function main() {
    await connection;
    app.listen(PORT, () => {
        console.log(`Server listening at PORT ${PORT}`);
    });
})();
