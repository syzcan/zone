/**
 * 基于后台定制渲染图表和页面，包括类型【list grid simple line bar pie text html】
 */
var requestData = requestData;
$(function() {
	if (requestData == undefined) {
		requestData = function(option, callback) {
			$.ajax({
				url : option.url,
				data : option.data,
				dataType : 'json',
				success : function(result) {
					callback(result);
				}
			});
		}
	}
	// 产生唯一id
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}
	function guid() {
		return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
	}

	var chartMap = {};
	// 缩放页面echart需要resize
	$(window).resize(function() {
		for (key in chartMap) {
			chartMap[key].resize();
		}
	});
	// 异步加载各模块内容
	$('.zchart').each(function() {
		initPanel($(this));
		renderPanel($(this));
	});
	// 初始化查询控件，绑定事件
	function initPanel($panel) {
		// 网格列表切换
		$panel.find('.zparams .fa').each(function() {
			var $this = $(this);
			$this.click(function() {
				if ($this.hasClass('fa-list')) {
					$this.addClass('fa-th-large').removeClass('fa-list');
					$panel.data('type', 'list');
				} else {
					$this.addClass('fa-list').removeClass('fa-th-large');
					$panel.data('type', 'grid');
				}
				renderPanel($panel);
			});
		});
		// 渲染时间控件
		$panel.find('.zparams input[data-time]').each(function() {
			laydate.render({
				elem : this,
				type : $(this).data('time'),
				done : function(value) {
					$(this.elem).val(value);
					filterData($panel);
				}
			});
		});
		// 渲染下拉框
		$panel.find('.zparams select').each(function() {
			$(this).change(function() {
				filterData($panel);
			});
		});
		$panel.find('.zparams input[type="button"],.zparams button').each(function() {
			$(this).click(function() {
				filterData($panel);
			});
		});
		$panel.find('.zparams input').each(function() {
			$(this).keydown(function(e) {
				if (e.which == 13) {
					filterData($panel);
				}
			});
		});
		$panel.find('form.zparams').submit(function() {
			return false;
		});
	}
	// 表单选择条件，筛选数据
	function filterData($panel) {
		// 筛选条件修改默认第一页
		$panel.find('input[name="page"]').val(1);
		renderPanel($panel);
	}
	// 渲染面板内容
	function renderPanel($panel) {
		var type = $panel.data('type');
		var options = $panel.find('script[data-options]').html();
		var $body = $panel.find('.zchart-body');
		if (type == 'text') {// 文本原样显示
			// $body.html('<pre>' + options + '</pre>');
		} else if (type == 'html') {
			options ? $body.html(options) : '';
			$body.find('.view').viewer({
				navbar : false,
				toolbar : false,
				fullscreen : true
			});
		} else {// 图表需要请求后台，其他文本类型直接显示
			$body.find('div.msg').remove();
			$body.append('<div class="msg"><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i></div>');
			try {
				options = $.trim(options);
				if (options != '') {
					if (options.substr(-1, 1) == ';') {
						options = options.substr(0, options.length - 1);
					}
					options = eval('(' + options + ')');
				}
			} catch (e) {
				console.warn(e);
				$body.find('.msg').html('<i class="fa fa-warning fa-lg text-danger"></i> options格式错误');
				return;
			}
			var defaults = defaultOptions();
			if (type != 'line' && type != 'bar' && type != 'pie'){
				options = $.extend(true, defaults, options)
			}
			// 分页值隐藏域设置
			$panel.find('input[name="rows"]').val(options.pageSize);
			var data_url = $panel.data('url');
			// 跳转分页
			if($panel.find('input[name="page"]').length > 0){
				data_url = data_url.replace(/(\d+).json$/,$panel.find('input[name="page"]').val()+'.json');
			}
			if (type == 'url') {
				if (!options.url || options.url == '') {
					$body.find('.msg').html('<i class="fa fa-warning fa-lg text-danger"></i> url无效');
					return;
				}
				data_url = options.url;
				type = options.urlType;
			}
			if (data_url.indexOf('http') != 0) {
				data_url = ctx + '/' + data_url;
			}
			var data = $panel.find('form').serialize();
			// 请求后台数据
			requestData({
				url : data_url,
				data : data
			}, function(result) {
				if (result.retCode != 200) {
					$body.find('.msg').html('<i class="fa fa-warning fa-lg text-danger"></i> ' + result.retMsg);
					return;
				}
				$body.find('.msg').remove();
				if (options.onLoadSuccess) {
					options.onLoadSuccess(result);
				}
				var param = {
						target : $body,
						type : type,
						options : options,
						rows : result.rows,
						total : result.total,
						dataset : result.dataset
				};
				if (param.type == 'list') {
					renderList(param);
				} else if (param.type == 'grid') {
					renderGrid(param);
				} else if (param.type == 'simple') {
					renderSimple(param);
				} else {
					// renderChart(param);
					renderChartDataset(param);
				}
			});
		}
	}

	// 默认options
	function defaultOptions() {
		return {
			fields : [], // 基础定义数据列模型
			title : {
				show : true
			},
			// 属性所属类型list/grid
			pagination : false, // 是否分页
			pageSize : 10,// 分页每页显示数量
			pageNum : 9,// 分页导航页码数量
			waterfall : false,// grid是否瀑布流
			gridBoxStyle : '',
			// url类型，会向该地址请求data
			url : '',
			urlType : 'grid',// url方式指定显示模式，默认grid
			onLoadSuccess : function(data) {

			}
		}
	}
	var field = {
			field : "name",
			// list/grid
			title : "姓名",
			style : "color:red",
			formatter : function(value, row, index) {
				return value;
			},
			// chart
			value : "num",
			serie : "genre"
	};

	// 表格数据渲染参考datagrid
	function renderList(param) {
		$container = $('<table class="table"><thead><tr></tr></thead><tbody></tbody></table>');
		if (param.options.title.show) {
			$.each(param.options.fields, function(i, n) {
				$container.find('thead>tr').append('<th data-field="' + n.field + '">' + (n.title ? n.title : '') + '</th>');
			});
		}
		$.each(param.rows, function(i, row) {
			var $item = $('<tr></tr>');
			$.each(param.options.fields, function(j, n) {
				var value = (row[n.field] ? row[n.field] : '');
				if (n.formatter) {
					value = n.formatter(value, row, i);
				} else {
					if (/.*(gif|png|jpg)$/.test(value)) {
						if (value.indexOf('http') != 0) {
							value = ctx + '/' + value;
						}
						value = '<img style="max-width:100%" src="' + value + '">';
					}
				}
				$field = $('<td field="' + n.field + '">' + (value ? value : '') + '</td>');
				if (n.style) {
					$field.attr('style', n.style);
				}
				$item.append($field);
			});
			$container.find('tbody').append($item);
		});
		$nav = pagination(param);
		param.target.html($container).append($nav);
	}
	// 网格显示
	function renderGrid(param) {
		$container = $('<div class="grid"></div>');
		$.each(param.rows, function(i, row) {
			var $item = $('<div class="grid-box" style="' + param.options.gridBoxStyle + '"></div>');
			$.each(param.options.fields, function(j, n) {
				var value = (row[n.field] ? row[n.field] : '');
				if (n.formatter) {
					value = n.formatter(value, row, i);
				} else {
					if (/.*(gif|png|jpg)$/.test(value)) {
						if (value.indexOf('http') != 0) {
							value = ctx + '/' + value;
						}
						value = '<img style="max-width:100%" src="' + value + '">';
					}
				}
				if (value == '') {
					return;
				}
				$field = $('<div class="grid-box-field" field="' + n.field + '">'
						+ (param.options.title.show && n.title ? '<span class="field-title">' + n.title + ': </span>' : '') + value + '</div>');
				if (n.style) {
					$field.attr('style', n.style);
				}
				$item.append($field);
			});
			$container.append($item);
		});
		$nav = pagination(param);
		param.target.html($container).append($nav);
		// 瀑布流
		if (param.options.waterfall) {
			var top = $('body').scrollTop();
			var colWidth = $container.find('.grid-box').first().outerWidth();
			$container.masonry({
				itemSelector : '.grid-box',
				columnWidth : colWidth ? (colWidth + 10) : 190,
						transitionDuration : 0
			});
			$container.imagesLoaded(function() {
				$container.masonry('layout');
				$('body').scrollTop(top);
			});
		}
	}
	// 分页
	function pagination(param) {
		if (param.options.pagination) {
			// 当前页
			$page = param.target.parent().find('input[name="page"]');
			var page = parseInt($page.val());
			var pageSize = param.options.pageSize;
			var totalPage = param.total % pageSize == 0 ? param.total / pageSize : (parseInt(param.total / pageSize) + 1);
			var pageNum = param.options.pageNum;
			$nav = $('<nav><ul class="pagination"></ul></nav>');
			if (totalPage > 1) {
				for (var i = page - parseInt(pageNum / 2); i <= page + parseInt(pageNum / 2); i++) {
					if (i > 0 && i <= totalPage) {
						$li = $('<li><a href="javascript:;">' + i + '</a></li>').data('num', i);
						if (i == page) {
							$li.addClass('active');
						}
						$nav.find('ul').append($li);
					}
				}
				if ($nav.find('ul>li').first().data('num') > 1) {
					$li_first = $('<li><a href="javascript:;">&laquo;</a></li>').data('num', 1);
					$nav.find('ul').prepend($li_first);
				}
				if ($nav.find('ul>li').last().data('num') < totalPage) {
					$li_last = $('<li><a href="javascript:;">&raquo;</a></li>').data('num', totalPage);
					$nav.find('ul').append($li_last);
				}
				$nav.find('ul>li').not('.active').click(function() {
					$page.val($(this).data('num'));
					renderPanel(param.target.parent());
				});
			}
			return $nav;
		}
		return '';
	}
	// 简单统计，返回标签和数值
	function renderSimple(param) {
		param.target.empty();
		var col = param.options.fields[0];
		$.each(param.rows, function(i, row) {
			param.target.append('<div class="simple"><span class="simple-label">' + row[col.field] + '</span><span class="simple-field">'
					+ row[col.value] + '</span></div>');
		});
	}
	// echarts4.0之后支持dataset，更加简洁
	function renderChartDataset(param){
		var chart = chartMap[param.target.data('chart-id')];
		if (!chart) {
			chart = echarts.init(param.target.data('chart-id', guid())[0]);
			chartMap[param.target.data('chart-id')] = chart;
		}
		chart.showLoading();
		option = {
				legend: {},
				tooltip: {},
				dataset: param.dataset,
				series: []
		};
		if(param.dataset && param.dataset.source.length > 0){
			if (param.type == 'bar' || param.type == 'line') {
				option.xAxis = {type: 'category'};
				option.yAxis = {};
				// 从第一行确定系列数量
				for(var i=1;i<param.dataset.source[0].length;i++){
					option.series.push({type:param.type});
				}
			}else{// pie
				for(var i=1;i<param.dataset.source[0].length;i++){
					// pie以行为系列
					if(param.dataset.source[0].length>2){
						option.series.push({type:'pie',radius:radius(i),name:param.dataset.source[0][i],encode:{itemName:'serie',value:param.dataset.source[0][i]}});
						function radius(i){
							return [(i-1)*100/(param.dataset.source[0].length-1)+'%',i*100/(param.dataset.source[0].length-1)-2+'%'];
						}
					}else{
						option.series.push({type:'pie'});
					}
				}
			}
		}
		option = $.extend(true, option, param.options);
		if(param.options.beforeSetOption){
			param.options.beforeSetOption(option);
		}
		chart.setOption(option,true);
		// 绑定事件
		if (chart.getOption().events) {
			for (e in option.events) {
				if (typeof option.events[e] === 'function') {
					chart.on(e, function(params) {
						option.events[e](params);
					});
				}
			}
		}
		chart.hideLoading();
	}
	// 4.0之前使用
	function renderChart(param) {
		var chart = chartMap[param.target.data('chart-id')];
		if (!chart) {
			chart = echarts.init(param.target.data('chart-id', guid())[0]);
			chartMap[param.target.data('chart-id')] = chart;
		}
		chart.showLoading();
		if (param.type == 'bar' || param.type == 'line') {// 柱状图和直线条，统计返回的全部是一行一个具体的指标
			var option = {
					tooltip : {
					},
					legend : {
						data : []
					},
					xAxis : {
						type : 'category',// 默认x轴为类型，y轴为值
						data : []
					},
					yAxis : {
						type : 'value',
						data : []
					},
					series : []
			};
			if (param.options.fields && param.options.fields.length > 0) {
				var col = param.options.fields[0];
				var legend = param.options.legend && param.options.legend.data?param.options.legend.data:[];
				var cate_data = [];
				var series = [];
				$.each(param.rows, function(i, row) {
					// 已设定不解析
					if(!param.options.legend || !param.options.legend.data){
						var flag = true;
						// 解析legend系列
						$.each(legend, function(j, k) {
							if (k == row[col.serie]) {
								flag = false;
								return false;
							}
						});
						if (flag) {
							legend.push(row[col.serie]);
						}
					}
					// 解析x轴系列
					var flag2 = true;
					$.each(cate_data, function(j, k) {
						if (k == row[col.field]) {
							flag2 = false;
							return false;
						}
					});
					if (flag2) {
						cate_data.push(row[col.field]);
					}
				});

				// 封装series数据
				$.each(legend, function(i, n) {
					var serie = {
							name : n,
							type : param.type,
							data : []
					};
					var data = [];
					$.each(cate_data, function(j, m) {
						var value = 0;
						$.each(param.rows, function(o, row) {
							if (row[col.serie] == n && row[col.field] == m) {
								value = row[col.value];
								param.rows.splice(o, 1);
								return false;
							}
						});
						data.push(value==null||value==undefined?0:value);
					});
					serie.data = data;
					series.push(serie);
				});
				option.legend.data = legend;
				if (param.options.yAxis && param.options.yAxis.type == 'category') {
					option.yAxis.data = cate_data;
				}else{
					option.xAxis.data = cate_data;
				}
				option.series = series;
			}
			option = $.extend(true, option, param.options);
			if(param.options.beforeSetOption){
				param.options.beforeSetOption(option);
			}
			chart.setOption(option,true);
		} else if (param.type == 'pie') {// 饼图统计指定系列和值，没有额外的cate_data需要的field
			var option = {
					tooltip : {
						formatter : "{a} <br/>{b} : {c} ({d}%)"
					},
					legend : {
						data : []
					},
					series : []
			};
			if (param.options.fields && param.options.fields.length > 0) {
				var col = param.options.fields[0];
				var legend = param.options.legend && param.options.legend.data?param.options.legend.data:[];
				var series = [];
				$.each(param.rows, function(i, row) {
					if(!param.options.legend || !param.options.legend.data){
						var flag = true;
						// 解析legend系列
						$.each(legend, function(j, k) {
							if (k == row[col.field]) {
								flag = false;
								return false;
							}
						});
						if (flag) {
							legend.push(row[col.field]);
						}
					}
					var flag2 = true;
					$.each(series, function(j, serie) {
						if (serie.name == row[col.serie]) {
							flag2 = false;
							return false;
						}
					});
					if(flag2){
						series.push({
							name : row[col.serie],
							type :  'pie',
							data : []
						});
					}
				});
				$.each(param.rows, function(i, row) {
					$.each(series, function(j, serie) {
						if (serie.name == row[col.serie]) {
							serie.data.push({
								name : row[col.field],
								value : row[col.value]
							});
						}
					});
				});
				option.legend.data = legend;
				option.series = series;
			}
			option = $.extend(true, option, param.options);
			if(param.options.beforeSetOption){
				param.options.beforeSetOption(option);
			}
			chart.setOption(option,true);
		}
		// 绑定事件
		if (chart.getOption().events) {
			for (e in option.events) {
				if (typeof option.events[e] === 'function') {
					chart.on(e, function(params) {
						option.events[e](params);
					});
				}
			}
		}
		chart.hideLoading();
	}
});