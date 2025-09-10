
// api
export interface IApiRequest {
  url: string;
  scrapeOption?: any;
}

function handleApiRequest(request: IApiRequest): { taskId: string } {
  const { url, scrapeOption } = request;
  const taskId = 'task123'; // uuidv4();

  return { taskId };
}


