const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);

// mongoose related imports
const TaskModel = require("./models/task.model");
mongoose.connection.on("open", () => {
    console.log("Connected to todo db");
});
const connection = mongoose.connect("mongodb://127.0.0.1:27017/todo");

// express middlewares start here
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    return res.status(200).send({ message: "Hello World" });
});

app.get("/api/tasks", async (req, res) => {
    try {
        const tasks = await TaskModel.find({}).lean().exec();
        const count = await TaskModel.countDocuments({});
        return res.status(200).send({ data: tasks, count });
    } catch (error) {
        return res.status(500).send({ code: 500, message: error.message });
    }
});

app.get("/api/tasks/:id", async (req, res) => {
    const { error, value } = Joi.object({
        id: Joi.objectId().required(),
    }).validate(req.params);
    if (error)
        return res
            .status(400)
            .send({ code: 400, message: error.details[0].message });

    try {
        const task = await TaskModel.findOne({ _id: value.id }).lean().exec();
        if (!task)
            return res.status(404).send({ code: 404, message: "Not Found" });
        return res.status(200).send(task);
    } catch (error) {
        return res.status(500).send({ code: 500, message: error.message });
    }
});

app.post("/api/tasks", async (req, res) => {
    const { error, value } = Joi.object({
        title: Joi.string().required(),
        isCompleted: Joi.boolean().default(false),
    }).validate(req.body);
    if (error)
        return res
            .status(400)
            .send({ code: 400, message: error.details[0].message });

    try {
        const newTask = new TaskModel(value);
        const task = await newTask.save();
        return res.status(200).send(task);
    } catch (error) {
        return res.status(500).send({ code: 500, message: error.message });
    }
});

app.patch("/api/tasks/:id", async (req, res) => {
    const { error, value } = Joi.object({
        id: Joi.objectId().required(),
        title: Joi.string(),
        isCompleted: Joi.boolean(),
    }).validate({ ...req.body, ...req.params });
    if (error)
        return res
            .status(400)
            .send({ code: 400, message: error.details[0].message });

    try {
        const task = await TaskModel.findOne({ _id: req.params.id })
            .lean()
            .exec();
        if (!task)
            return res.status(404).send({ code: 404, message: "Not Found" });

        const updatedTask = await TaskModel.findOneAndUpdate(
            { _id: req.params.id },
            req.body,
            {
                new: true,
            }
        );

        return res.status(200).send(updatedTask);
    } catch (error) {
        return res.status(500).send({ code: 500, message: error.message });
    }
});

app.delete("/api/tasks/:id", async (req, res) => {
    const { error, value } = Joi.object({
        id: Joi.objectId().required(),
    }).validate(req.params);
    if (error)
        return res
            .status(400)
            .send({ code: 400, message: error.details[0].message });

    try {
        await TaskModel.deleteOne({ _id: req.params.id });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).send({ code: 500, message: error.message });
    }
});

const PORT = 3000;
(async function main() {
    await connection;
    app.listen(PORT, () => {
        console.log(`Server listening at PORT ${PORT}`);
    });
})();
