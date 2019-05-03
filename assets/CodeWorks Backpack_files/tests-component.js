(function () {

	var windowslide = document.getElementById('window-slide')
	var mochaStats = document.getElementById('mocha-stats')
	var mochaElem = document.getElementById('mocha')

	var comp = Vue.component('lesson-tests-loader', {
		props: ['socket', 'payload'],
		template: getTemplate(),
		data() {
			return {
				completed: false,
				slideOpen: false,
				tests: false
			}
		},
		methods: {
			toggleSlide() {
				this.slideOpen = !this.slideOpen
				mochaStats = document.getElementById('mocha-stats')
				mochaStats.className = this.slideOpen ? 'open' : ''
			},
			loadTestSuite() {
				window.assert = chai.assert
				window.spy = sinon.spy
				mocha.suite.suites = [];
				mocha.setup({
					ui: 'bdd',
				});
			},
			runTests() {
				mochaElem = mochaElem || document.getElementById('mocha')
				mochaElem.innerHTML = ''
				if (typeof test.tests == 'function') {
					this.tests = true
					this.loadTestSuite()
					test.tests()
					var res = mocha.run(r => {
						if (res.stats.passes == res.total) {
							if (!this.completed) {
								this.completed = true
								this.socket.emit('LESSONPASSED', this.payload)
							}
						} else if (res.stats.passes != res.total && this.completed) {
							this.completed = false
							this.socket.emit('LESSONFAIL', this.payload)
						}
					})
					mochaStats = document.getElementById('mocha-stats')
					mochaStats.className = this.slideOpen ? 'open' : ''
				}
			}
		}
	})

	function getTemplate() {
		return `
		<div id="window-slide" class="window-slide" :class="{open: slideOpen}" v-show="tests">
		    <div class="window-slide-button no-select" @click="toggleSlide" :class="{'test-success': completed}">
		      TESTS
		    </div>
		    <div class="window-slide-content p-1">
		      <div id="mocha"></div>
		    </div>
		</div>
		`
	}

}())