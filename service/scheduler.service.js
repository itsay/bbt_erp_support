
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
            JOB_DEFINITIONS.forEach((job) => {
                console.log(`SchedulerService.startJobs: start job ${job.func.name} with cron ${job.job}`)
                const cronJob = new CronJob(job.job, async () => {
                    try {
                        console.log(`Job ${job.func.name} starts`)
                        await job.func(...job.args);
                        console.log(`Job ${job.func.name} ends`)
                    } catch (error) {
                        console.error(`Job ${job.func.name} failed:`, error);
                    }
                });
                cronJob.start();
                SELF.jobs.push(cronJob);
            });
        },
        stopJobs: () => {
            console.log(`SchedulerService.stopJobs: stop all jobs`);
            SELF.jobs.forEach((cronJob) => {
                cronJob.stop();
            });
            SELF.jobs = [];
        }
    }
}

module.exports = SchedulerService();