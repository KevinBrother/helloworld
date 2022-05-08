import { $http } from '../utils/http';
class MessageService {
  getMessage() {
    return $http.get('https://api.github.com/hub').then(res => {
      console.log(res);
      return { name: 'jj', age: 18 };
    }).catch(err => {
      console.log(err);
    });
  }
}

export const messageService = new MessageService();