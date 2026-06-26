import axios from 'axios';
axios.post('http://localhost:9090/transactions/transfer', {
  type: 'MOBILE',
  fromAccountId: 1,
  toMobileNumber: '9090909090',
  amount: 50
}).then(res => console.log(res.data))
  .catch(err => console.error(err.response?.data));
