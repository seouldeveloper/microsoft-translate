var https = require('https'),
  http = require('http'),
  request = require('request');
  querystring = require('querystring'),
  client = {},
  credentials = {},
  regx = /<string [a-zA-Z0-9=":/.]+>(.*)<\/string>/;

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('/tmp/bing-translate');
}
var ACCESS_TOKEN_VALID_MILSEC	= 599*1000;

exports.init = function(clientSecret){
  client.credentials = clientSecret;
  return client;
}

client.parseXHTMLString = function(text){
  return text.replace(/\\u000a/gi,'\n')
             .replace(/\\/g,'')
             .replace(/"/g,'');
}

client.translate = function(obj, callback){
  if (obj.model === 'nmt') {
      client.getNmtToken(client.credentials, function(err, token) {
          var text = obj.text;
          var from = obj.source;
          var to = obj.target;

          var pathString = '';
          if(from) {
              pathString = '/V2/Http.svc/Translate?text='+encodeURIComponent(text)+'&from='+from+'&to='+to+'&contentType=text/plain';
          } else {
              pathString = '/V2/Http.svc/Translate?text='+encodeURIComponent(text)+'&to='+to+'&contentType=text/plain';
          }

          pathString = '/V2/Http.svc/Translate?text='+encodeURIComponent(text)+'&to='+to+'&contentType=text/plain';
          var req = http.request({
              host: 'api.microsofttranslator.com',
              port: 80,
              path: pathString,
              method: 'GET',
              headers: {
                  'Authorization': 'Bearer ' + token
              }
          });
          req.on('response', function(response){
              var data = '';
              response.on('data', function(chunk){
                  data += chunk;
              });
              response.on('end', function(){
                  var error, translation;
                  try {
                      translation = regx.exec(data)[1];
                  } catch(e) {
                      error = 'parse-exception';
                  }
                  callback(obj, error, {
                      translatedText: client.parseXHTMLString(translation)
                  });
              });
          });
          req.on('error', function(e){
              callback(new Error(e.message), null);
          });
          req.end();
      });
  } else {
      client.getSmtToken(client.credentials, function(err, token) {
          var text = obj.text;
          var from = obj.source;
          var to = obj.target;

          var pathString = '';
          if(from) {
              pathString = '/V2/Http.svc/Translate?text='+encodeURIComponent(text)+'&from='+from+'&to='+to+'&contentType=text/plain';
          } else {
              pathString = '/V2/Http.svc/Translate?text='+encodeURIComponent(text)+'&to='+to+'&contentType=text/plain';
          }

          pathString = '/V2/Http.svc/Translate?text='+encodeURIComponent(text)+'&to='+to+'&contentType=text/plain';
          var req = http.request({
              host: 'api.microsofttranslator.com',
              port: 80,
              path: pathString,
              method: 'GET',
              headers: {
                  'Authorization': 'Bearer ' + token.access_token
              }
          });
          req.on('response', function(response){
              var data = '';
              response.on('data', function(chunk){
                  data += chunk;
              });
              response.on('end', function(){
                  var error, translation;
                  try {
                      translation = regx.exec(data)[1];
                  } catch(e) {
                      error = 'parse-exception';
                  }
                  callback(obj, error, {
                      translatedText: client.parseXHTMLString(translation)
                  });
              });
          });
          req.on('error', function(e){
              callback(new Error(e.message), null);
          });
          req.end();
      });
  }
}

client.retrieveSmtAccessToken = function(callback) {
  callback(localStorage.getItem("bing_access_token"))
}

client.retrieveNmtAccessToken = function(callback) {
    callback(localStorage.getItem("azure_access_token"))
}

client.saveSmtAccessToken = function(token) {
  localStorage.setItem("bing_access_token", token);
  localStorage.setItem("bing_access_date", new Date().getTime())
}

client.saveNmtAccessToken = function(token) {
    localStorage.setItem("azure_access_token", token);
    localStorage.setItem("azure_access_date", new Date().getTime())
}

client.checkIfSmtAccessTokenValidTime = function(callback) {
  
  var date = localStorage.getItem("bing_access_date");
  if(date == null) {
	  callback(false);
	  return;
  }
    
  var duration = new Date().getTime() - date;
  
  if(duration > ACCESS_TOKEN_VALID_MILSEC) 
  {
    callback(false);
  } 
  else 
  {
    callback(true);
  }	
}

client.checkIfNmtAccessTokenValidTime = function(callback) {

    var date = localStorage.getItem("azure_access_date");
    if(date == null) {
        callback(false);
        return;
    }

    var duration = new Date().getTime() - date;

    if(duration > ACCESS_TOKEN_VALID_MILSEC)
    {
        callback(false);
    }
    else
    {
        callback(true);
    }
}

client.getSmtToken = function(credentials, callback){
    client.checkIfSmtAccessTokenValidTime(function(isValid){
        if(isValid) {
            client.retrieveSmtAccessToken(function(access_token) {
                callback(null, JSON.parse(access_token));
            });
        } else {
            var post_data = querystring.stringify({
                'grant_type': 'client_credentials',
                'scope': 'http://api.microsofttranslator.com',
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret
            });
            var req = https.request({
                hostname: 'datamarket.accesscontrol.windows.net',
                port: 443,
                path: '/v2/OAuth2-13/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': post_data.length
                },
            }, function(res){
                res.setEncoding('utf8');
                res.on('data', function(response){
                    client.saveSmtAccessToken(JSON.stringify(JSON.parse(response)));
                    callback(null, JSON.parse(response));
                });
            });
            req.on('error', function(e){
                callback(new Error(e.message), null);
            });
            req.write(post_data);
            req.end();
        }
    })
}

client.getNmtToken = function(credentials, callback){
  client.checkIfNmtAccessTokenValidTime(function(isValid){
    if(isValid) {
        client.retrieveNmtAccessToken(function(access_token) {
          callback(null, access_token);
        });
    } else {
      request.post(
        {
          url: 'https://api.cognitive.microsoft.com/sts/v1.0/issueToken',
          headers: {
            'Ocp-Apim-Subscription-Key': credentials.azure_client_secret
          },
          method: 'POST'
        },	
        function (error, response, body) {
          if (!error && response.statusCode == 200) {
            client.saveNmtAccessToken(body);
            callback(null, body);
          }
        }
      );
    }
  })
}