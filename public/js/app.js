var app = angular.module('app', ['firebase']);

const FIREBASE_HOST = 'https://test-b5dbd.firebaseio.com/';

app.config(function() {
	// config lives in APIKeys.js
	firebase.initializeApp(FIREBASE_PRODUCTION_CONFIG);
});

app.controller('appController', function(
	$scope,
	$firebaseObject,
	$firebaseAuth
) {
	var firebaseRef = firebase.database().ref();
	var storageRef = firebase.storage().ref();
	$scope.auth = $firebaseAuth();
	$scope.loggedIn = false;

	var toastActive = false;
	$scope.processing = false;
	$scope.loading = 4;
	$scope.downloadURL = [];

	$scope.auth.$onAuthStateChanged(function(authData) {
		if (authData) {
			// Verify the user is a superuser, and if not, prompt them to switch accounts
			console.log('Logged in', authData);
			firebase
				.database()
				.ref('users')
				.child(authData.uid)
				.child('permissions')
				.once('value', snap => {
					console.log('User permissions:', snap.val());
					if (snap.val() !== 'superuser') {
						alert(
							'That account does not have superuser priveledges. Try logging in with a different account or contacting the administrators (venligboerneapp@gmail.com).'
						);
						$scope.signIn();
					}
				});

			$scope.categories = $firebaseObject(firebaseRef.child('categories'));
			$scope.users = $firebaseObject(firebaseRef.child('users'));
			$scope.centers = $firebaseObject(firebaseRef.child('centers'));
			$scope.languageOptions = $firebaseObject(
				firebaseRef.child('languageOptions')
			);
			$scope.posts = $firebaseObject(firebaseRef.child('posts'));
			$scope.flags = $firebaseObject(firebaseRef.child('flags'));
		} else {
			$scope.categories = {};
			$scope.users = {};
			$scope.centers = {};
			$scope.languageOptions = {};
			$scope.posts = {};
			$scope.signIn();
		}
	});

	$scope.signIn = function() {
		$scope.auth
			.$signInWithPopup('facebook')
			.then(function(result) {
				console.log('Signed in as:', result.user.uid);
			})
			.catch(function(error) {
				console.error('Authentication failed:', error);
			});
	};

	$scope.prepareEditField = function(table, instance, field) {
		$scope.cancelEdits(table);
		instance.editing[field] = true;
	};

	$scope.editField = function(instance, tableStr, field, value) {
		console.log(instance);
		instance.editing[field] = false;
		var update_package = {};
		update_package[field] = value;
		firebaseRef.child(tableStr + '/' + instance.key).update(update_package);
		if (!toastActive) {
			toastActive = true;
			Materialize.toast('Edit saved', 1000, '', function() {
				toastActive = false;
			});
		}
	};

	$scope.cancelEdits = function(table) {
		Object.keys(table).forEach(function(key) {
			if (table[key]) {
				table[key].editing = {};
				table[key].key = key;
			}
		});
	};

	$scope.viewFlags = function(userID) {
		$scope.usersFlags = $scope.flags[userID];

		Object.keys($scope.usersFlags).forEach(function(key) {
			const flag = $scope.usersFlags[key];
			firebaseRef
				.child('users')
				.child(flag.flaggingUser)
				.child('displayName')
				.once('value', function(name) {
					$scope.usersFlags[key].flaggingUser = name.val();
				});

			if (flag.postID) {
				firebaseRef
					.child('posts')
					.child(flag.postID)
					.once('value', function(post) {
						$scope.usersFlags[key].regarding =
							post.val().title + ': ' + post.val().description;
						$scope.$apply();
					});
				$scope.usersFlags[key].type = 'Post';
			} else if (flag.applicationID) {
				firebaseRef
					.child('applications')
					.child(flag.applicationID)
					.once('value', function(application) {
						$scope.usersFlags[key].regarding = application.val().message;
						$scope.$apply();
					});
				$scope.usersFlags[key].type = 'Application';
			} else {
				console.warn('No postID or applicationID', flag);
			}
		});
	};

	$scope.changeUserPermissions = function(user, users, permissions) {
		$scope.cancelEdits(users);
		if (user.permissions === 'superuser' || permissions === 'superuser') {
			alert(
				'You cannot edit superuser priveledges. Please contact the venligboerne app creators (bedelson@stanford.edu) to add a superuser.'
			);
			return;
		}
		console.log('Change user permissions', user, 'to', permissions);
		firebaseRef.child('users/' + user.key + '/permissions').set(permissions);
	};

	$scope.file_changed = function(element, instance, field, bucket, tableStr) {
		$scope.$apply(function(scope) {
			var photofile = element.files[0];
			var reader = new FileReader();
			reader.onload = function(e) {
				// TODO jpeg may not be the true type, but this works fine with pngs somehow
				var blob = new Blob([e.target.result], { type: 'image/jpeg' });

				Materialize.toast('Uploading...', 500, '', function() {
					toastActive = false;
				});

				var storageRef = firebase.storage().ref(bucket).child(instance.key);
				var uploadTask = storageRef.put(blob, {
					// Let the images be cached for a week
					cacheControl: 'public, max-age=604800'
				});

				uploadTask.on(
					'state_changed',
					function progress(snapshot) {
						var percentage =
							snapshot.bytesTransferred / snapshot.totalBytes * 100;
						// use the percentage as you wish, to show progress of an upload for example
					}, // use the function below for error handling
					function(error) {
						console.warn('Image upload failed', error);
						switch (error.code) {
							case 'storage/unauthorized':
								// User doesn't have permission to access the object
								alert(
									'It appears that you do not have access to file storage. Please contact the administrators (venligboerneapp@gmail.com) so they can add your credentials.'
								);
								break;

							case 'storage/canceled':
								// User canceled the upload
								break;

							case 'storage/unknown':
								// Unknown error occurred, inspect error.serverResponse
								break;
						}
					},
					function complete() {
						//This function executes after a successful upload
						$scope.downloadURL.push(uploadTask.snapshot.downloadURL);
						if (field != '') {
							$scope.editField(
								instance,
								tableStr,
								field,
								uploadTask.snapshot.downloadURL
							);
							instance.editing[field] = false;
						}
					}
				);
			};
			reader.readAsArrayBuffer(photofile);
		});
	};

	$scope.removeField = function(tableStr, table, instance) {
		if (confirm('Would you really like to delete this?')) {
			$scope.cancelEdits(table);
			firebaseRef.child(tableStr + '/' + instance.key).remove();
		}
	};

	//This is so stupid lol
	$scope.removePost = function(tableStr, posts, instance) {
		if (confirm('Would you really like to delete this post?')) {
			$scope.cancelEdits(posts);
			if (instance.applications) {
				Object.keys(instance.applications).forEach(function(key) {
					firebaseRef
						.child('applications')
						.child(key)
						.once('value')
						.then(function(snapshot) {
							var applicant = snapshot.val().applicant;
							firebaseRef.child('applications').child(key).remove();
							firebaseRef
								.child('users')
								.child(applicant)
								.child('applications')
								.child(key)
								.remove();
						});
				});
			}
			firebaseRef.child('posts' + '/' + instance.key).remove();
		}
	};

	$scope.addCenter = function() {
		console.log('add center');
		if (!$scope.center || !$scope.downloadURL) {
			Materialize.toast('Required fields cannot be left blank.', 3000);
			return;
		}

		$scope.processing = true;
		$scope.center.image = $scope.downloadURL[0];
		firebaseRef.child('centers').push($scope.center, function(err) {
			$scope.processing = false;
			if (err) {
				Materialize.toast(err.message, 5000);
			} else {
				$scope.downloadURL = [];
				window.location.replace('/');
			}
		});
	};

	$scope.addCategory = function() {
		console.log('Add Category');
		if (!$scope.category || !$scope.downloadURL[0] || !$scope.downloadURL[1]) {
			Materialize.toast('Required fields cannot be left blank.', 3000);
			return;
		}

		$scope.processing = true;
		let iconName = $scope.category.title.toLowerCase().replace(' ', '_');
		firebaseRef.child('categories').child(iconName).set({
			title: $scope.category.title,
			icon: iconName,
			iconURL: $scope.downloadURL[0],
			pinURL: $scope.downloadURL[1]
		}, function(err) {
			$scope.processing = false;
			if (err) {
				Materialize.toast(err.message, 5000);
			} else {
				$scope.downloadURL = [];
				window.location.replace('/');
			}
		});
	};

	$scope.addLanguageOption = function() {
		console.log('add language');
		if (!$scope.languageOption || !$scope.downloadURL) {
			Materialize.toast('Required fields cannot be left blank.', 3000);
			return;
		}

		$scope.processing = true;

		firebaseRef.child('languageOptions').child($scope.languageOption.name).set({
			name: $scope.languageOption.name,
			flag: $scope.downloadURL[0]
		}, function(err) {
			$scope.processing = false;
			if (err) {
				Materialize.toast(err.message, 5000);
			} else {
				$scope.downloadURL = [];
				window.location.replace('/');
			}
		});
	};
});
