var menubar = require('menubar'); /* https://github.com/maxogden/menubar */
const {ipcMain, net} = require('electron')

var login_url = "http://192.168.2.254:8090/login.xml";

var mb = menubar({
	"width": 240,
	"height": 200,
	"showOnAllWorkspaces": true,
	"preloadWindow": true,
	// "showOnRightClick": true,
})

// mb.on('ready', function ready (argument) {
// 	mb.showWindow();
// })

mb.on('after-create-window', function () {
  console.log('app is ready')
  // mb.window.webContents.openDevTools();
  var wc = mb.window.webContents;
  wc.on('did-finish-load', () => {
    wc.send('defaults_event', {"title":"Habita Login"});
  })
})

ipcMain.on('login_pass_entered', function (event, message) {
  if (!("password" in message && "username" in message)) {
    console.log("missing password or username"); // TODO send back error message
    return;
  }

  username = message.username;
  password = message.password;
  
  startBackgroundLogin();
});

var was_offline = false;
ipcMain.on('online-status-changed', function (event, message) {
  
  if (message == "offline") {
    was_offline = true;
    stopBackgroundLogin();
  } else if (was_offline) {
    was_offline = false;
    startBackgroundLogin();
  }

});

var username = null,
  password = null;
function autoLogin() {
  const request = net.request({
  	"method": "POST",
  	"url": login_url,
  })

  request.on('response', function (response) {
  		console.log(response.statusCode);
  		response.on("data", function (data) {
  			var response_text = data.toString().substring(39);
  			var success = (response_text.indexOf("<status><![CDATA[LIVE]]></status>") >= 0)
  							or (response_text.indexOf("<status><![CDATA[LOGIN]]></status>") >= 0);
        if (success) {
          // TODO send back success message
        } else {
          // TODO send back error message
          console.log(response_text, success); 
        }
  		})
  });

  request.setHeader("Content-Type", "application/x-www-form-urlencoded");

  request.end(
		[
			"mode=191",
			"username="+encodeURIComponent(username),
			"password="+encodeURIComponent(password),
			"a="+(new Date).getTime(),
			"producttype=0"
		].join("&")
	);

}

var the_login_interval = false,
  durationMin = 1;
var startBackgroundLogin = function (newDuration) {
  if (newDuration) {
    durationMin = newDuration;
  }
  the_login_interval = setInterval(autoLogin, durationMin * 60 * 1000);
}
var stopBackgroundLogin = function () {
  clearInterval(the_login_interval);
}
