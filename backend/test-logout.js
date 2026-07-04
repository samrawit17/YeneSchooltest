const http = require('http');

const req = http.request('http://localhost:8001/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Login status:', res.statusCode);
    const cookies = res.headers['set-cookie'];
    console.log('Login set-cookie:', cookies);
    
    if (cookies && cookies.length > 0) {
      const authCookie = cookies[0].split(';')[0];
      const logoutReq = http.request('http://localhost:8001/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': authCookie
        }
      }, (logoutRes) => {
        let lData = '';
        logoutRes.on('data', chunk => lData += chunk);
        logoutRes.on('end', () => {
          console.log('Logout status:', logoutRes.statusCode);
          console.log('Logout set-cookie:', logoutRes.headers['set-cookie']);
        });
      });
      logoutReq.end();
    }
  });
});

req.write(JSON.stringify({
  loginIdentifier: 'superadmin@lemarisms.com', // wait, does superadmin exist? Let's just use what I saw in db pull, but db pull failed.
  password: 'password123'
}));
req.end();
