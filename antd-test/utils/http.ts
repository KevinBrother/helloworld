import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { cloneDeep, get, isNumber, isString } from 'lodash-es';

function createHttp() {
  const client = axios.create({
    timeout: 1000 * 60 * 10,
    headers: {}
  });

  /* // FIXME 2022年5月7日 14:30:39 ts类型不能使用
    client.interceptors.request.use((config: AxiosRequestConfig) => {
    });
   */
  client.interceptors.response.use(
    (response) => {
      const { data: rsp = {}, config = {} } = response;
      const { url, method } = config;
      const { code, msg, data } = rsp;
      return data;
    },
    (error) => {
      if (get(error, 'response.status') === 401) {
        return;
      }
      const message = get(error, 'response.data.message', '');
      return Promise.reject(error);
    }
  );
  return client;
}

const $http = createHttp();

export { $http };
