import express from "express";
import cookieParser from "cookie-parser";
const app = express();

app.use(cookieParser());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PATCH, PUT, DELETE"
  );
  res.header("Allow", "GET, POST, PATCH, OPTIONS, PUT, DELETE");
  next();
});


app.get("/v3/api/login", (req, res) => {
  console.log('你还没有登录，我去和 server2 进行交互')
  // res.redirect(301, 'http://localhost:13002/sso/api/login?redirectUrl=http://localhost:13001/v3/getCode')
  res.send({
    code: 502,
    msg: '请先登录'
  })

});

let userInfoStore:any = null;

app.get("/v3/getCode", async (req, res) => {
  const code = req.query.code;
  console.log('code:', code);
  const codeResponse = await fetch(`http://localhost:13002/sso/api/getToken?code=${code}`);
  const { access_token, id_token } = await codeResponse.json();

  const userInfoResponse = await fetch(`http://localhost:13002/sso/api/getUserInfo?access_token=${access_token}&id_token=${id_token}`);
  const userInfo = await userInfoResponse.json();
  console.log('userInfo:', userInfo);
  userInfoStore = userInfo;
  const token = access_token + id_token;
  
  res.redirect(301, 'http://localhost:51731/#/sso-login?token=' + token)
})



app.listen(13001, () => {
  console.log("Server is running on port 3000, visit http://localhost:13001/");
});
