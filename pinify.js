const Jimp = require('jimp');

module.exports = function pinify(url, callback) {
	const blankPinURL =
		'https://firebasestorage.googleapis.com/v0/b/test-b5dbd.appspot.com/o/pins%2Fblank_pin.png?alt=media&token=bfac1f75-dacb-4c36-b800-0280c4fffedf';

	Jimp.read(url, function(err1, icon) {
		Jimp.read(blankPinURL, function(err2, blankPin) {
			console.log('Loaded Image', err1, err2, icon, blankPin);
			blankPin
				.composite(
					icon
						.autocrop()
						.contain(
							256,
							256,
							Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE
						),
					128,
					64
				)
				.getBuffer(Jimp.MIME_PNG, function(err, buffer) {
					console.log(buffer);
					callback(buffer);
				});
		});
	});
};
