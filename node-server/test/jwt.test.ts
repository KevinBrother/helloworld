import { expect, test } from 'vitest'
import crypto from 'crypto'


// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXIiLCJpYXQiOjE3MTI1NTU3MDQsImV4cCI6MTcxMjU1OTMwNH0.Y2H3NXlXOCVtTXlcyqop38qlgCeb88GeC4vB9slVvFs
function testJwtSign() {
    let secret = "your-secret-key";
    let headerAndPayload = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXIiLCJpYXQiOjE3MTI1NTU3MDQsImV4cCI6MTcxMjU1OTMwNH0";

    var hash = crypto.createHmac('SHA256', secret).update(headerAndPayload).digest('base64');
    console.log('hash', hash)
    return hash;
}


test('jwt-signature', () => {
  expect(testJwtSign().match('Y2H3NXlXOCVtTXlcyqop38qlgCeb88GeC4vB9slVvFs'))
})