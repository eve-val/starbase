App = (function($, model) {
	var tower = null;

	var fuel_interval_map = {
		1:"Hour",
		2:"Day",
		3:"Week"
	}

	function update_tower_types() {
		var show_faction = $('#tower-type-show-faction').is(':checked');
		$('#tower-type').empty();
		for (var idx in model.data.towers) {
			var t = model.data.towers[idx];
			if (model.data.tower(t).faction && !show_faction) {
				continue;
			}
			var e = $('<option />', {text: t});
			$('#tower-type').append(e);
		}
	}

	function update_tower_export() {
		$('#tower-export-text').text(tower.serialize());
	}

	function update_tower_details() {
		var tt = model.data.tower(tower.type);

		$('#tower-details-name').text(tower.type);

		$('#tower-details-pg').text(number_format(tt.power));
		$('#tower-details-cpu').text(number_format(tt.cpu));

		var resonances = tower.getResonances();
		$('#tower-details-resonance-em').text(convertToResistance(resonances.em));
		$('#tower-details-resonance-kinetic').text(convertToResistance(resonances.kinetic));
		$('#tower-details-resonance-thermal').text(convertToResistance(resonances.thermal));
		$('#tower-details-resonance-explosive').text(convertToResistance(resonances.explosive));



		var pg_left = $('#tower-details-pg-left');
		pg_left.text(number_format(tower.getPower()));
		if (tower.getPower() >= 0) {
			pg_left.addClass('success').removeClass('danger');
		} else {
			pg_left.addClass('danger').removeClass('success');
		}

		var cpu_left = $('#tower-details-cpu-left');
		cpu_left.text(number_format(tower.getCPU()));
		if (tower.getCPU() >= 0) {
			cpu_left.addClass('success').removeClass('danger');
		} else {
			cpu_left.addClass('danger').removeClass('success');
		}

		calc_effective_hp();

		update_fuel_block_calc();

		var e_modules = $('#tower-details-modules');
		e_modules.empty();

		var i = 0;
		var textBuild = [];
		var mods = tower.getModules();
		for (var idx in mods) {
			var m = mods[idx];
			textBuild[i++] = "<tr>";
				textBuild[i++] = "<td>"+m.name+"</td>";
				textBuild[i++] = '<td><label class="label label-default" style="top: 5px;position: relative;">' + m.count + '</label></td>';
				textBuild[i++] = "<td>"+number_format(m.power)+"</td>";
				textBuild[i++] = "<td>"+number_format(m.cpu)+"</td>";
				textBuild[i++] = "<td>";
					textBuild[i++] = "<button class='btn btn-sm btn-success' title='"+m.name+"'><i class='fa fa-plus'></i></button>";
					textBuild[i++] = "&nbsp;";
					textBuild[i++] = "<button class='btn btn-sm btn-danger' title='"+m.name+"'><i class='fa fa-minus'></i></button>";
				textBuild[i++] = "</td>";
			textBuild[i++] = "</tr>";
		}

		// commit elements to DOM
		e_modules.append(textBuild.join(''));

		// apply events
		$('button.btn-success', e_modules).click(function() {
			tower.add($(this).attr('title'));
		});
		$('button.btn-danger', e_modules).click(function() {
			tower.remove($(this).attr('title'));
		});
	}


	function update_mod_picker() {
		var e_type = $('#mod-picker-type');
		var e_silly = $('#mod-picker-show-silly');
		var e_faction = $('#mod-picker-show-faction');
		var e_obsolete = $('#mod-picker-show-obsolete');

		var show_silly = e_silly.is(':checked');
		var show_faction = e_faction.is(':checked');
		var show_obsolete = e_obsolete.is(':checked');

		var sel = e_type.val();

		var moduleBuild = {};

		e_type.empty();
		for (var idx in model.data.mods) {
			var m = model.data.mods[idx];
			if (!show_silly && tower.isModSilly(m)) {
				continue;
			}
			if (!show_obsolete && tower.isModObsolete(m)) {
				continue;
			}
			if (!show_faction && model.data.mod(m).faction) {
				continue;
			}

			m = model.data.mod(m);

			if (typeof moduleBuild[m.group] === 'undefined')
				moduleBuild[m.group] = [];

			moduleBuild[m.group].push(m);
		}

		for (var group in moduleBuild) {
			var groupBuild = "<optgroup label='"+group+"'>";
			for (var mod in moduleBuild[group]) {

				var m = moduleBuild[group][mod];
				var opts = {'text': m.name};

				if (m.name == sel) {
					opts['selected'] = 'selected';
				}

				var e = $('<option />', opts);
				groupBuild += e.wrap('<div>').parent().html();
			}

			groupBuild += "</optgroup>";
			e_type.append(groupBuild);
		}
	}

	function update_fragment() {
		window.location.hash = tower.exportToFragment();
	}

	function add_mod() {
		tower.add($('#mod-picker-type').val());
	}

	function set_tower_type() {
		tower.setType($('#tower-type').val());
	}

	function init_tower_types() {
		$('#tower-type-show-faction').change(update_tower_types);
		$('#tower-type-set').click(set_tower_type);
		$('#tower-type-sov').click(tower_updated);
		update_tower_types();
	}

	function init_mod_picker() {
		$('#mod-picker-show-silly').change(update_mod_picker);
		$('#mod-picker-show-faction').change(update_mod_picker);
		$('#mod-picker-show-obsolete').change(update_mod_picker);
		$('#mod-picker-add').click(add_mod);
		update_mod_picker();
	}

	function init_actions() {

		// Link Actions
		$('.stopLink').on('click, dblclick', function(e){
			e.preventDefault();
			return false;
		})

		// Modal Actions
		$('#urlModal').on('shown.bs.modal', function(){
			var url = window.location;
			$('.buildLink').val(url);
		});
		$('#getBuild').on('click', function(e){
			e.preventDefault();
			$('#urlModal').modal('show');
			return false;
		});

		// setup select2 boxes
		$(document).ready(function() {
			$("#tower-type, #mod-picker-type").select2();
		});

		// setup fuel sliders:


		$("#tower-fuel-interval").slider({
			step: 1,
			min: 1,
			max: 3,
			formatter: function(value) {
				return fuel_interval_map[value];
			}
		});
		$("#tower-fuel-interval").on("change", function(slider) {
			update_fuel_block_slider();
			$("#tower-fuel-value").slider()
			$("#tower-fuel-interval-text").text(fuel_interval_map[slider.value]+'s');
		});

		$("#tower-stront-timer").slider({
			step: 1,
			min: 1,
			max: 55,
			formatter: function(value) {
				return value + ' Hours';
			}
		});
		$("#tower-stront-timer").on("change", function(slider) {
			update_stront_calc();
			$("#tower-stront-timer-text").text(slider.value+' Hours');
		});

		update_fuel_block_slider()

		//$("#tower-fuel-slider").slider({step: 20000, min: 0, max: 200000});
	}

	function update_fuel_block_slider() {
		var max = 0;
		var slider_val = $("#tower-fuel-interval").slider('getValue');

		if (slider_val === 1) {
			max = 24;
		}
		else if(slider_val === 2) {
			max = 49;
		}
		else {
			max = 7;
		}

		$("#tower-fuel-value").slider({
			step: 1,
			min: 1,
			value: 1,
			max: max,
			formatter: function(value) {
				return '# of ' + fuel_interval_map[slider_val] + 's: ' + value;
			}
		});
		$("#tower-fuel-value").slider('setValue',1);
		$("#tower-fuel-value").off('change').on("change", function(slider) {
			$("#tower-fuel-value-text").text((typeof slider.value === 'undefined' ? '1' : slider.value) + ' ' + fuel_interval_map[slider_val] + (slider.value > 1 ? 's' : ''));
			update_fuel_block_calc();
		});
		$("#tower-fuel-value").trigger('change');
		update_fuel_block_calc();
	}

	function update_fuel_block_calc() {

		var tt = model.data.tower(tower.type);

		var duration = $("#tower-fuel-interval").slider('getValue');
		var tempVal = $("#tower-fuel-value").slider('getValue')
		var value = (typeof tempVal === 'number' ? tempVal : '1');

		var hours = 1;
		if (duration === 1) {
			hours = value;
		}
		else if(duration === 2) {
			hours = value * 24;
		}
		else {
			hours = value * 7 * 24;
		}

		// Monthly Fuel Calc
		var e_sov = $('#tower-type-sov');
		var is_sov = e_sov.is(':checked');
		var fuel = tower.getFuelConsumption('online', hours, is_sov);

		for (var name in fuel) {
			$('#tower-details-fuel-volume').text(number_format(fuel[name] * 5));
			$('#tower-details-fuel-volume-max').text(number_format(tt.fuelbays['online']));
			$('#tower-details-fuel-monthly').text(number_format(fuel[name]) + ' ' + name);
		}
	}

	function update_stront_calc() {

		var tt = model.data.tower(tower.type);

		var duration = $("#tower-fuel-interval").slider('getValue');
		var tempVal = $("#tower-stront-timer").slider('getValue')
		var value = (typeof tempVal === 'number' ? tempVal : '1');

		// Monthly Fuel Calc
		var e_sov = $('#tower-type-sov');
		var is_sov = e_sov.is(':checked');
		var stront = tower.getFuelConsumption('reinforce', 1, is_sov);

		for (var name in stront) {
			$('#tower-details-stront-volume').text(number_format(stront[name] * value * 3));
			$('#tower-details-stront-volume-max').text(number_format(tt.fuelbays['reinforce']));
			$('#tower-details-stront-hourly').text(number_format(stront[name]) + ' ' + name);
		}
	}

	function calc_effective_hp() {
		var hp = tower.calcTowerHP();

		$('#tower-details-hitpoints').text(number_format(hp.effective));
		$('#tower-hp-shield').text(number_format(hp.shield));
		$('#tower-hp-armor').text(number_format(hp.armor));
		$('#tower-hp-structure').text(number_format(hp.structure));
	}

	function tower_updated() {
		update_tower_details();
		update_tower_export();
		update_mod_picker();

		update_fuel_block_calc();
		update_stront_calc();

		update_fragment();
	}

	function convertToResistance(fpn) {
		var resist = Math.floor((fpn * 100 - 100) * -1);
		if (resist == 100) {
			resist -= 1;
		}
		return resist;
	}

	function init() {
		tower = new Model.tower();

		init_tower_types();
		init_mod_picker();
		init_actions();

		tower.update(tower_updated);

		update_fuel_block_calc();
		update_stront_calc();

		if (!window.location.hash || !tower.importFromFragment(window.location.hash.substring(1))) {
			set_tower_type();
		}
	}

	$(document).ready(init);
})(jQuery, Model);