const assert = require('assert')
const ProgressBar = require('progress')

describe('WordsearchGenerator', function() {
	const temp_logger = require('./temp_js_logger')
	let wg
	
	before(function(done) {
		temp_logger.set_level('info')
		
		temp_logger.imports_promise.then(function() {
			wg = require('./wordsearch_generator.js')
			wg.environment_promise.then(done)
		})
	})
	
	describe.skip('char_to_code and code_to_char', function() {
		it('generates the correct unicodes from characters')
		
		it('generates the correct characters from unicodes')
		
		it('holds true that char_to_code(a)=b and char_to_code(b)=a for x random char codes')
	})
	
	describe('prob_dist', function() {
		let w
		let sample_size = 30000000
		let max_error = 0.05
		
		function char_to_idx(char) {
			return wg.char_to_code(char) - wg.char_to_code('가')
		}
		
		function dist_stats(freq_dist) {
			let stats = {
				max_idx: null,
				max_val: -1,
				
				min_idx: null,
				min_val: Number.MAX_VALUE,
				
				sum: 0,
				avg: null,
				count: freq_dist.length
			}
			
			for (let i=0; i<stats.count; i++) {
				let v = freq_dist[i]
				
				if (v > stats.max_val) {
					stats.max_val = v
					stats.max_idx = i
				}
				
				if (v < stats.min_val) {
					stats.min_val = v
					stats.min_idx = i
				}
				
				stats.sum += v
			}
			
			stats.avg = stats.sum / stats.count
			
			return stats
		}
		
		function unique_char_count(wg_alphabet) {
			return wg_alphabet.counts.reduce(
				(prev,curr) => { return prev+curr },
				0
			)
		}
	
		describe('ko', function() {
			before(function(done) {
				w = new wg.WordsearchGenerator('ko', 'lower', 10, [], false, 'test')
				w.init_promise.then(function() {
					console.log('debug wordsearch generator created')
					done()
				})
			})
			
			it('generates random characters w dictionary prob dist', function() {
				console.log('debug set prob dist = dictionary')
				w.set_probability_distribution('dictionary')
				.then(function() {					
					// create a sample of random characters
					let sample_dist = new Array(unique_char_count(w.alphabet))
					.fill(0)
					console.log(
						`debug collect sample distribution of size ${
							sample_size
						} for ${
							sample_dist.length
						} unique chars`
					)
					
					let progress_sample = new ProgressBar(
						'collect sample [:bar] (:percent) ',
						{
							total: sample_size
						}
					)
					for (let i=0; i<sample_size; i++) {
						sample_dist[char_to_idx(w.random_cell())] += 1
						progress_sample.tick()
					}
					
					let stats = dist_stats(sample_dist)
					console.log(`info sample dist stats:\n${JSON.stringify(stats, undefined, 2)}`)
					assert.equal(stats.sum, sample_size)
					
					// convert freq dist to prob dist
					console.log(`debug convert sample freq dist to prob dist`)
					sample_dist = sample_dist.map((f) => { return f / stats.sum })
					
					// check error against ideal probability distribution
					return new Promise(function(resolve, reject) {
						wg.load_alphabet_probability_dist_file('ko_prob_dist.txt')
						.then(
							function(prob_dist) {
								let real_dist = new Array(...prob_dist.probabilities)
								assert.equal(real_dist.length, sample_dist.length)
							
								let errors = new Array(sample_dist.length)
								let progress_errors = new ProgressBar(
									'calculate errors [:bar] (:percent) ',
									{
										total: errors.length
									}
								)
								for (let i=0; i<errors.length; i++) {
									let den = real_dist[i]
									if (den == 0) {
										den = sample_dist[i]
									}
									
									let num = Math.abs(sample_dist[i] - real_dist[i])
									if (num == 0) {
										den = 1
									}
									
									errors[i] = num / den
									if (num/den > 1) {
										console.log(
											`error big error sample=${sample_dist[i]} real=${real_dist[i]}`
										)
									}
									progress_errors.tick()
								}
						
								console.log('debug calculate error stats')
								let error_stats = dist_stats(errors)
								assert.equal(error_stats.count, errors.length)
								console.log(`info errors stats:\n${
									JSON.stringify(error_stats, undefined, 2)
								}`)
								assert.ok(error_stats.avg <= max_error)
								
								resolve()
							},
							function() {
								reject()
							}
						)
					})
				})
			})
		})
	})
})
