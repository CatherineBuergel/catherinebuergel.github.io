(function () {

	marked.setOptions({
		renderer: new marked.Renderer(),
		gfm: true,
		tables: true,
		breaks: false,
		pedantic: false,
		sanitize: false,
		smartLists: true,
		smartypants: false,
		xhtml: false
	});

	window['foo-app'] = new Vue({
		el: "#codeworks-codefoo-app",
		data() {
			return {
				activeView: 'Readme',
				views: ['Output', 'Readme'],
				socket: {},
				payload: {},
				complete: false,
				userFiles: [],
				lessonFiles: [],
				userLesson: {},
				mount: {},
				jscode: {},
				loadOrder: [],
				index: {},
				md: '',
				showConsole: false,
				consoleInput: '',
				mountElems: {},
				mounts: ['foo-mount', 'user-js', 'readme', 'user-specs', 'user-css', 'video-loader', 'console-output']
			}
		},
		mounted() {
			this.loadSocket()
			this.setMounts()
		},
		methods: {
			toggleConsole() {
				this.showConsole = !this.showConsole
			},
			clearConsole() {
				console.clear()
			},
			parseConsoleInput() {
				try {
					console.log(`<span style="color: red; text-shadow:none;">${this.consoleInput}<span><br/>`, eval(this.consoleInput))
				} catch (e) {
					console.logError(e)
				}
				this.consoleInput = ''
			},
			setMounts(student) {
				this.mounts.forEach(m => {
					this.mountElems[m] = this.mountElems[m] || document.getElementById(m)
					if (student && m == 'readme' || m == 'video-loader') { return }
					this.mountElems[m].innerHTML = ''
				})
			},
			setView(view) {
				this.activeView = view
			},
			loadSocket() {
				this.socket = io();
				this.socket.on('connect', () => {
					params = new URL(location.href).searchParams;
					this.payload = {
						lessonId: params.get('lessonid'),
						userId: params.get('userid'),
						unitId: params.get('unitid')
					}
					this.socket.emit('LESSONLOADER', this.payload)
				})

				this.socket.on('SETLESSON', payload => {
					this.setUnit(payload)
				})

				this.socket.on('LESSONUPDATE', payload => {
					// ENSURE user files do not override lessons
					this.complete = payload.passed
					this.userLesson = payload
					this.userFiles = payload.files
					this.userFiles = this.userFiles.filter(f => f.extension != 'md' && f.extension != 'spec')
					this.loadFiles(this.userFiles, true)
				})

				this.socket.on('RUNTESTS', payload => {
					if (this.lessonFiles.find(f => f.extension == 'spec')) {
						//run tests
					} else {
						//pass lesson there are no tests
						this.socket.emit('LESSONPASSED', this.payload)
					}
				})

			},
			loadFiles(files, student) {
				this.setMounts(student)
				// console.clear()
				this.mountElems['foo-mount'].innerHTML = ''
				this.jscode = {}
				this.index = files.find(f => f.filename.toLowerCase() == 'index.html')
				this.setJSLoadOrder().then((res) => {
					this.mountElems['foo-mount'].innerHTML = this.index ? this.index.code : '<h1>Hello CodeFoo</h1>'
					//HANDLE globals
					window.globals = {}
					globals.guess = readmeGuess
					//RESET JAVASCRIPT FILES
					files.forEach(this.loadFile)
					this.loadJS(res)
					if (!student) {
						this.renderMD()
					}
					this.$refs.testSuite.runTests()
				})
			},
			loadFile(file) {
				if (file.extension == 'html') { return }
				var target = ''
				var type = ''
				switch (file.extension) {
					case 'css':
						target = 'user-css'
						type = 'style'
						break;
					case 'js':
						this.jscode[file.filename] = file.code
						return
					case 'spec':
						target = 'user-specs'
						type = 'script'
						break;
					case 'md':
						this.loadMarkdown(file)
						return;
					case 'json':
						this.parseJSON(file)
						return;
					default:
						console.warn(`[FILE ERROR] Unable to load ${file.filename} `, file)
						return;
				}
				try {
					let filesElem = document.getElementById(target)
					filesElem.innerHTML = ''
					var e = document.createElement(type)
					e.innerHTML = file.code
					filesElem.appendChild(e)
				} catch (e) {
					console.warn('UNABLE TO LOAD FILE ', file, e)
				}
			},
			setJSLoadOrder() {
				this.loadOrder = []
				var externalScripts = []
				if (!this.index) { return Promise.all([]) }
				var r = /<script.*?src="(.*?)"/gi
				var c = this
				this.index.code.replace(r, function () {
					var matches = arguments[1];
					if (matches.indexOf('//') == -1) {
						c.loadOrder.push(matches);
					} else {
						externalScripts.push(matches)
					}
				})
				return Promise.all(externalScripts.map(f => {
					return fetch(f).then(res => res.text()).then(text => text)
				}))
			},
			loadJS(libs) {
				var code = ''
				libs.forEach(lib => code += lib + ';')
				if (this.loadOrder.length > 0) {
					this.loadOrder.forEach(f => {
						if (this.jscode[f]) {
							code += `;\n${this.jscode[f]};\n`
						} else {
							console.log('[FILE ERROR]', 'you attempted to load a file that doesnt exist', f)
						}
					})
				} else {
					this.userFiles.forEach(f => {
						if (f.extension == 'js') {
							code += `;\n${f.code};\n`
						}
					})
				}
				this.code = code
				var userScripts = document.createElement('script')
				userScripts.type = 'text/javascript'
				userScripts.textContent = `
				(function(){
					try{
						${code}
					}catch(e){
						console.error('[LOAD ERROR] unable to load JavaScript files', e.message)
						var error = {
							message: '[LOAD ERROR] unable to load JavaScript files: <p style="margin-left: 1.5rem">-' + e.message + '</p>'
						}
						console.logError(error)
					}
				}())`
				this.mountElems['user-js'].innerHTML = ''
				this.mountElems['user-js'].appendChild(userScripts)
			},
			setUnit(payload) {
				if (!payload.lesson || !payload.lesson.files) { return console.error('[INSTRUCTION ERROR] UNABLE TO LOAD LESSON') }
				// LOAD THE TEACHER LESSON 
				this.lessonFiles = payload.lesson.files
				this.loadFiles(payload.lesson.files)
			},
			loadMarkdown(file) {
				try {
					this.md += marked(file.code || '')
				} catch (e) {
					console.error('Markdown Conversion Failed', e)
				}
			},
			renderMD() {
				this.mountElems.readme.innerHTML = ''
				this.mountElems.readme.innerHTML = this.md
				this.md = ''
				try {
					document.querySelectorAll('pre code').forEach(function (block) {
						//TODO: Resolve this regex for firefox support
						// var lang = block.className.match(/(?<=lang-).*/)
						// if (lang) { block.setAttribute('data-lang', lang[0]) }
						hljs.highlightBlock(block);
					});
				} catch (e) {
					console.log('[MARKDOWN ERROR] Unable to perform syntax highlighting', e)
				}
			},
			parseJSON(file) {
				try {
					var x = JSON.parse(file.code)
					if (x.video) {
						var frame = document.createElement('iframe')
						frame.src = `//${location.host}/videos?videoid=${x.video.id}&studentid=${params.get('userid')}`
						frame.marginHeight = 0;
						frame.marginWidth = 0;
						frame.width = '100%'
						frame.frameBorder = 0
						frame.scrolling = 'no'
						this.mountElems['video-loader'].innerHTML = ''
						this.mountElems['video-loader'].appendChild(frame)
					}
				} catch (e) {
					console.warn('UNABLE TO PARSE JSON FILE ', file, e)
				}
			}
		}
	})



}())