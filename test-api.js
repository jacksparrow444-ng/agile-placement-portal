const http = require('http');

const data = JSON.stringify({
  companyId: 2, // Kenya Global Tech
  jobTitle: 'Test Job',
  jobDescription: 'Desc',
  salary: '10 LPA',
  location: 'Remote',
  jobType: 'full-time',
  workMode: 'remote',
  eligibility: 7.0,
  skills: 'Node',
  lastDate: '2026-05-01',
  maxBacklogs: 0
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/company/post-job',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
