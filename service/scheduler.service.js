
const CronJob = require('cron').CronJob
const OmisellJobController = require('../route/omisell/omisell.job.controller')
const WebhookController = require('../route/webhook/webhook.controller')

/**
 * Example:
 * [
 *      job: <cron>,
 *      func: OmisellJobController.jobSaveOrders
 *      args: <args>,
 *      tags: ['omisell']
 * ]
 */
const JOB_DEFINITIONS = [
    {
        job: '0 23 * * *',
        func: OmisellJobController.jobSaveOrders,
        args: [],
    },
    {
        job: '0 23 * * *',
        func: OmisellJobController.jobSavePickups,
        args: [],
    },
    {
        job: '*/1 * * * *',
        func: WebhookController.jobProcessNewOrders,
        args: [20],
    },
]


function SchedulerService() {
    const SELF = {
        jobs: []
    }
    return {
        startJobs: () => {
            const clog = (msg) => `[SchedulerService] ${msg}`;
            JOB_DEFINITIONS.forEach((job) => {
                clog(`start job ${job.func.name} with cron ${job.job}`)
                const cronJob = new CronJob(job.job, async () => {
                    try {
                        clog(`Job ${job.func.name} starts`)
                        await job.func(...job.args);
                        clog(`Job ${job.func.name} ends`)
                    } catch (error) {
                        clog(`Job ${job.func.name} failed: ${error.message}`);
                    }
                }, null, true, 'Asia/Ho_Chi_Minh');
                cronJob.start();
                SELF.jobs.push(cronJob);
            });
        },
        stopJobs: () => {
            clog(`SchedulerService.stopJobs: stop all jobs`);
            SELF.jobs.forEach((cronJob) => {
                cronJob.stop();
            });
            SELF.jobs = [];
        }
    }
}

module.exports = SchedulerService();