const uuid = require('uuid');
const uuidv4 = uuid.v4;

class Queue {
    jobs = []
    process = null;
    threads = 10;
    callback = 10;
    externalEventListeners = {
        'task_finish': [],
        'task_failed': [],
    };

    emit(type) {
        if (type in this.externalEventListeners) {
            for (var i = this.externalEventListeners[type].length; i > 0; i--) {
                this.externalEventListeners[type][this.externalEventListeners[type].length - i].apply(null, [].slice.call(arguments, 1));
            }
        }
    }

    on(k, listener) {
        const origin = this.externalEventListeners[k] ?? null;
        if (origin) {
            this.externalEventListeners[k] = this.externalEventListeners[k] || [];
            this.externalEventListeners[k].push(listener);
        }
    }

    constructor(callback, opts = { concurrent: 10 }) {
        this.jobs = [];
        this.threads = opts.concurrent;
        this.callback = callback;
        this.excute();
    }

    size = () => this.jobs.length

    excute = async () => {
        while (this.jobs.length > 0) {
            const tasks = this.jobs.slice(-this.threads);
            await Promise.all(tasks);
            this.jobs.splice(-this.threads);
        }
    }

    push = (data) => {
        const task = { id: uuidv4(), data: data };
        const process = this.process(task);
        this.jobs.unshift(process);
    }

    process = async (task) => {
        return new Promise((resolve, reject) => {
            try {
                const done = (result) => {
                    resolve(result);
                    this.emit('task_finish', result.id, result);
                }
                this.callback(task, done)
            } catch (error) {
                reject(error);
                this.emit('task_failed', error);
            }
        })
    }
}

module.exports = Queue;