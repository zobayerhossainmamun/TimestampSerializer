require('dotenv').config();
const ProcessData = require('./ProcessData');

const main = async () => {
    try {
        ProcessData.start();
    } catch (err) {
        console.log(err);
    }
}

main();