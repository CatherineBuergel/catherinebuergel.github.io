// @ts-nocheck
(function () {

	function logInterceptor() {
		var c = console.clear
		var l = console.log
		Array.prototype.toString = function () {
			return Object.prototype.toString(this)
		}
		Object.prototype.toString = function (arr) {
			var val = this
			if (arr) {
				val = arr
			}
			var out = '<pre>'
			out += JSON.stringify(val, null, 2)
			out += '</pre>'
			return out
		}

		console.clear = function () {
			try {
				var cElem = document.getElementById('console-output')
				cElem.innerHTML = ''
				c()
			} catch (e) {
				console.error(e)
			}
		}

		console.logError = function (e) {
			var cElem = document.getElementById('console-output')
			cElem.innerHTML += `
			<div class="console-line">
				<p class="console-line alert alert-danger" style="padding: 1rem; background-color: brown;	">
				<span class="console-line-item">[LOG ERROR] ${e.message}</span>
				</p>
			</div>
			`
		}

		return function () {
			try {
				var cElem = document.getElementById('console-output')
				l(...arguments)
				var args = [...arguments];
				var template = '<div class="console-line">'
				args.forEach(a => template += `<span class="console-line-item">${a}</span>`)
				template += '</div>'
				cElem.innerHTML += template
			} catch (e) {
				console.logError(e)
			}
		}

	}
	console.log = logInterceptor()

	window.readmeGuess = function guess(guess) {
		if (guess) {
			swal({
				title: 'Good Job',
				text: 'Let the adventure continue',
				type: 'success',
				timer: 2500
			}).catch(swal.noop);
		} else {
			swal({
				title: 'Oops ',
				text: 'Sorry that is not correct. Keep Trying!',
				type: 'error',
				timer: 2500
			}).catch(swal.noop);
		}
	};

	window.readmeGuessInput = function (event, val) {
		event.preventDefault()
		event.target.value == val ?
			event.target.classList.add('solved')
			:
			event.target.classList.remove('solved')
	}

	window.toObj = (arr) => {
		var out = {}
		if (Array.isArray(arr)) {
			arr.forEach(i => {
				if (i._id) {
					out[i._id] = i
				}
			})
		}
		return out
	}

	window.asArray = (obj) => {
		if (!obj) { return [] }
		if (Array.isArray(obj)) { return obj }
		return Object.keys(obj).map((prop) => obj[prop])
	}

}())