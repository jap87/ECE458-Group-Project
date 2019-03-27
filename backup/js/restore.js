var nodemailer = require('nodemailer');
var smtp = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(smtp({
	service: 'gmail',
	host: 'smtp.gmail.com',
	auth: {
		user: 'hypotheticalmea3s@gmail.com',
		pass: 'admin458proj'
	}
}));

var options = {
	from: 'hypotheticalmea3s@gmail.com',
	to: process.argv[2],
	subject: 'Database restore on ' + new Date().toString() + ' requested by host ' + process.argv[3],
	text: process.argv[4] == 'false' ? `The restore failed with error: ${process.argv[5]}.` : "The restore completed successfully." 
};

transporter.sendMail(options, function(error, info) {
	if (error) {
		console.log(error);
	} else {
		console.log('Email sent: ' + info.response);
	}
});
