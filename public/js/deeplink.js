function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

window.onload = function() {
	if (typeof window.orientation !== 'undefined') {
		//mobile device
		const operatingSystem = getMobileOperatingSystem();
		if (operatingSystem === 'iOS') {
			setTimeout(function() {
				window.location =
					'https://itunes.apple.com/us/app/venligboerne/id1263035197';
			}, 500); //app store URL
		} else if (operatingSystem === 'Android') {
			setTimeout(function() {
				window.location =
					'https://play.google.com/store/apps/details?id=com.venligboerne.app';
			}, 500); //play store URL
			const redirect = getParameterByName('url');
			window.location.replace(redirect);
		}
		// Temporarily moved the below code into Android Specific until Expo fixes
		// their bug.
		// const redirect = getParameterByName('url');
		// window.location.replace(redirect);
	}
};

function getMobileOperatingSystem() {
	var userAgent = navigator.userAgent || navigator.vendor || window.opera;

	if (/android/i.test(userAgent)) {
		return 'Android';
	}

	if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
		return 'iOS';
	}

	return 'unknown';
}
