/**
 * Example:
 * [
 *      job: <cron>,
 *      func: OmisellJobController.jobSaveOrders
 *      args: <args>,
 *      tags: ['omisell']
 * ]
 */
const CronJob = require('cron').CronJob


const JOB_DEFINITIONS = []


function SchedulerService() {
    const SELF = {
        jobs: []
    }
    return {
        startJobs: async () => {
            JOB_DEFINITIONS.forEach((job) => {
                const cronJob = new CronJob(job.job, async () => {
                    try {
                        await job.func(...job.args);
                    } catch (error) {
                        console.error(`Job ${job.func.name} failed:`, error);
                    }
                });
                cronJob.start();
                SELF.jobs.push(cronJob);
            });
        },
        stopJobs: async () => {
            SELF.jobs.forEach((cronJob) => {
                cronJob.stop();
            });
            SELF.jobs = [];
        }
    }
}

module.exports = SchedulerService();