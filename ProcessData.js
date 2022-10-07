const knex = require('./db_handler');
const DataDecider = require('./DataDecider.json');

class ProcessData {
    constructor() {
        this.INTERVAL_TIME = 1000;
        this.MAX_LIMIT = 5;
        this.LOOP_PAGE = 0;
    }
    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async start() {
        await this.timeout(this.INTERVAL_TIME);
        try {
            const offset = this.MAX_LIMIT * this.LOOP_PAGE;
            let result = await knex(process.env.DB_TABLE).select('*').where('worked', false).offset(offset).limit(this.MAX_LIMIT).orderBy('id', 'asc');
            if (result.length > 0) {
                await this.process(result, this);
                this.LOOP_PAGE++;
            } else {
                this.LOOP_PAGE = 0;
            }
            this.start();
        } catch (err) {
            console.log(err);
            this.start();
        }
    }
    getMinuteDiff(start, end) {
        const s_date = new Date(start);
        const e_date = new Date(end);
        const diffMs = (e_date - s_date);
        return Math.round(((diffMs % 86400000) % 3600000) / 60000) - 1;
    }
    getValue(a) {
        if (isNaN(a)) {
            return 0;
        } else {
            return Number(a);
        }
    }
    process(result, e) {
        return new Promise(async (resolve, reject) => {
            let last_data = result[0];
            for (let data of result) {
                let diff = e.getMinuteDiff(last_data.timestamp, data.timestamp);
                if (diff > 0) {
                    let tmp_date = new Date(last_data.timestamp);
                    for (let i = 0; i < diff; i++) {
                        tmp_date.setMinutes(tmp_date.getMinutes() + 1);

                        let k = {
                            timestamp: tmp_date,
                            timestamp_created: new Date(),
                            worked: true
                        };

                        for (let key of Object.keys(DataDecider)) {
                            if (DataDecider[key] === true) {
                                let otf = e.getValue(last_data[key]);
                                let otl = e.getValue(data[key]);

                                let val = 0;
                                val = (otl - otf);
                                val = val / (diff + 1);
                                val = otf + val;

                                k[key] = val;
                            } else {
                                k[key] = last_data[key];
                            }
                        }
                        try {
                            await knex(process.env.DB_TABLE).insert(k);
                            console.log(`Imported with : ${tmp_date}`);
                        } catch (err) {
                            console.log(err)
                            console.log('Error in inserting data');
                        }
                    }
                    await knex(process.env.DB_TABLE).update({ worked: true }).where('id', data.id);
                }
                last_data = data;
            }
            resolve();
        });
    }
}

module.exports = new ProcessData();