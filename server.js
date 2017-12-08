"use strict";
let express = require('express'),
	app = express(),
	jsforce = require('jsforce');

var schedule = require('node-schedule');
var conn = new jsforce.Connection();
var username = process.env.SF_USERNAME;
var password = process.env.SF_PASSWORD;

var Users = [];
var currentUser = '';
app.set('port', process.env.PORT || 5000);
	//
var ns = schedule.scheduleJob(process.env.SCHEDULE_CORN_EXP , function(){
	console.log('Scheduler started running!!!!');
	conn = new jsforce.Connection({
		loginUrl : process.env.SF_LOGIN_URL
	});
	conn.login(username, password, function(err, userInfo) {
		if (err) { return console.error(err); }
		//Fetching Followers
		conn.apex.get("/Followers", function(err, resp) {
			if(err) { return console.log(err); }
			else {
				var res1 = JSON.parse(JSON.parse(JSON.stringify(resp)));
				for (var count=0; count < res1.length; count++) {
					console.log('users>>>>>',count);
					Users.push(res1[count].Id);
				}
				if( Users.length > 0 )
					followerCaller(Users[0]);
			}
		});
	});
});

var followerCaller = function(id) {
	currentUser = id;
	conn.apex.get("/Follower/Articles/" + id, FollowerHandler);
}

var FollowerHandler = function(err, resp2){
	var res2 = JSON.parse(JSON.parse(JSON.stringify(resp2)));
	console.log('res 2 list >>>>>',res2.FirstName);
	Users.splice(Users.indexOf(currentUser), 1);
	if(res2){
		var emailContent='';
		if(res2.lstArticle.length > 59)
			res2.lstArticle.length = 60 ;
		for (var i=0; i < res2.lstArticle.length; i++) {
			//console.log('i   >>>>>',i);
			emailContent+= '<p><a href="' + process.env.SF_DOMAIN + 
			res2.lstArticle[i].parentId + '">' + res2.lstArticle[i].Title + '</a></p><br >';
			
			if(i == (res2.lstArticle.length)-1 ){
				email(res2.Email, res2.FirstName , emailContent , Users.length);
			}
		}
	}
}

var email = function(toEmail, FirstN , emailC , UsersLen){
	console.log('First name : ',FirstN);
	//console.log('Users length: ',UsersLen);
	const sgMail = require('@sendgrid/mail');
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
	sgMail.setSubstitutionWrappers('{{', '}}');
	if(process.env.SENDGRID_EMAIL_NOTIFICATION != 'TRUE'){
		toEmail = process.env.SENDGRID_EMAIL_NOTIFICATION ;
	}
	const msg = {
	  to: toEmail,
	  from: process.env.SENDGRID_FROM_EMAIL,
	  subject: process.env.SENDGRID_EMAIL_SUBJECT,
	  //text: 'Hello plain world!',
	  //html: emailC + '<br ><br >Thank You!',
	  templateId: process.env.SENDGRID_TEMPLATE_ID,
	  substitutions: {
		name : FirstN,
		links : emailC,
	  },
	};
	
	sgMail.send(msg , function(err,json){
		if(err){
		  return console.error(err);
		}
		else {
			//console.log(json);
			console.log('Email Sent to ',FirstN);
		}
	});
	if( UsersLen > 0 ) {
		followerCaller( Users[0] );
		//console.log('inside user len fun...');
	}
}

var reqTimer = setTimeout(function wakeUp() {
         console.log("WAKE UP DYNO");
      return reqTimer = setTimeout(wakeUp, 1200000);
}, 1200000);

app.get('/', function(req,res){
	res.send("<h3><centre>Welcome to Wave 6 Article's Followers Email Notifications</centre></h3>");
});

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});