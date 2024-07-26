var mousePosition, active_element;
var offset = [0,0];
var isDown = false;
var slider_min = -11;

var default_range = [0,100];
var default_round = 0;
var default_color = '#009155';

var slider_positions = {};
var slider_percentages = {};
var slider_values = {};

document.addEventListener('mouseup', function() {
    isDown = false;
    document.body.style.webkitUserSelect = '';
    document.body.style.mozUserSelect = '';
    document.body.style.msUserSelect = '';
}, true);

document.addEventListener('mousemove', function(event) {
    if (isDown) {
        mousePosition = {x:event.clientX, y:event.clientY};

        var current_input = active_element.parentElement.parentElement.parentElement.childNodes[1];
        var slider_groover = active_element.parentElement.firstChild;
        var name = current_input.name;
        var slider_max = slider_groover.clientWidth+slider_min;
        var min = parseFloat(current_input.min);
        var max = parseFloat(current_input.max);
        if ((min !== '' && max !== '') && (min < max)) {
            var range = [min, max]
        } else {
            var range = default_range;
        }
        var left_pos = mousePosition.x + offset[0];

        if (left_pos < slider_min) {
            slider_positions[name] = slider_min;
        } else if (left_pos > slider_max) {
            slider_positions[name] = slider_max+2;
        } else {
            slider_positions[name] = left_pos;
        }

        var percentages = 100*(slider_positions[name]-slider_min-2)/slider_groover.clientWidth;
        var value = range[0]+(range[1]-range[0])*percentages/100;

        setSliderTo(name, value);
    }
}, true);

var sliders = document.getElementsByClassName('slider1');

function createSlider(slider) {
    var slider_parent = createSuperElement('div', {'class':'slider1_parent'});
    slider.parentNode.insertBefore(slider_parent, slider);
    slider_parent.appendChild(slider);

    if (slider.getAttribute('text')) {
        var text = createSuperElement('p', {'class':'title'}, slider.getAttribute('text'));
    } else {
        var text = createSuperElement('span');
    }

    slider_parent.insertBefore(text, slider);

    var color = slider.getAttribute('color') !== null ? slider.getAttribute('color') : default_color;

    var slider_main_block = createSuperElement('div', {'class':'main_block'});
    var slider_groove_parent = createSuperElement('div', {'class':'groove_parent'});
    var slider_groove = createSuperElement('div', {'class':'groove'});
    var slider_fill = createSuperElement('div', {'class':'fill'}, '', {'background-color':color});
    var slider_rider = createSuperElement('div', {'class':'rider'});

    var min = parseFloat(slider.min);
    var max = parseFloat(slider.max);
    if ((min !== '' && max !== '') && (min < max)) {
        var range = [min, max]
    } else {
        var range = default_range;
    }

    var table_data = [[[range[0], {'class':'left'}],[range[1], {'class':'right'}]]];
    var slider_range = createSuperTable(table_data, {'class':'slider_range'});

    slider_groove.appendChild(slider_fill);
    slider_groove_parent.appendChild(slider_groove);
    slider_groove_parent.appendChild(slider_rider);
    slider_main_block.appendChild(slider_groove_parent);
    slider_main_block.appendChild(slider_range);
    slider_parent.appendChild(slider_main_block);

    slider_rider.addEventListener('mousedown', function(e) {
        var current_input = this.parentElement.parentElement.parentElement.childNodes[1];

        isDown = true;
        offset[0] = this.offsetLeft - e.clientX;
        active_element = this;

        if (current_input.getAttribute('animate') !== 'no') {
            this.parentNode.lastChild.style.transition = '';
            this.parentNode.firstChild.firstChild.style.transition = '';
        }

        document.body.style.webkitUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
        document.body.style.msUserSelect = 'none';

    }, true);

    slider_groove.addEventListener('click', function(e) {
        var current_input = this.parentElement.parentElement.parentElement.childNodes[1];
        var name = current_input.name;
        var click_position = e.clientX-my_offset(this).left;

        var min = parseFloat(current_input.min);
        var max = parseFloat(current_input.max);
        if ((min !== '' && max !== '') && (min < max)) {
            var range = [min, max]
        } else {
            var range = default_range;
        }

        if (current_input.getAttribute('animate') !== 'no') {
            this.parentNode.lastChild.style.transition = 'left 0.2s ease-in-out';
            this.parentNode.firstChild.firstChild.style.transition = 'width 0.2s ease-in-out';
        }

        var percentages = 100*(click_position)/(this.clientWidth+2);
        var value = range[0]+(range[1]-range[0])*percentages/100;
        setSliderTo(name, value);

    }, true);

    slider.addEventListener('change', function(e) {
        setSliderTo(this.name, this.value);
    }, true);

    if (!slider.value) slider.value = 0;
    setSliderTo(slider.name, slider.value);
}

for (var i = 0; i < sliders.length; i++) {
    createSlider(sliders[i]);
}

function setSliderTo(name, value) {
    var slider = document.getElementsByName(name)[0];
    value = parseFloat(value);

    var min = parseFloat(slider.min);
    var max = parseFloat(slider.max);
    if ((min !== '' && max !== '') && (min < max)) {
        var range = [min, max]
    } else {
        var range = default_range;
    }

    if (value >= range[0] && value <= range[1] && !isNaN(value)) {
        var data_round = slider.getAttribute('round') !== null ? slider.getAttribute('round') : default_round;
        if (slider.getAttribute('smooth') !== 'yes') value = round(value, data_round);
        slider_percentages[name] = 100*(value - range[0])/(range[1] - range[0]);
        slider.parentNode.childNodes[2].firstChild.firstChild.firstChild.style.width=round(slider_percentages[name], 2)+'%';
        slider.parentNode.childNodes[2].firstChild.lastChild.style.left = 'calc('+round(slider_percentages[name], 2)+'% - 11px )';
        value = round(value, data_round);
        slider.value = value;
        slider_values[name] = value;

    } else {
        //console.log('Value ['+value+'] is out of slider range: '+range[0]+'-'+range[1] || default_range[1]);
        if (value < range[0] && !isNaN(value)) setSliderTo(name, range[0]);
        else if (value > range[1] && !isNaN(value)) setSliderTo(name, range[1]);
        else slider.value = slider_values[name];
    }

    slider.onchange();
}

function my_offset(elem) {
    if(!elem) elem = this;

    var x = elem.offsetLeft;
    var y = elem.offsetTop;

    while (elem = elem.offsetParent) {
        x += elem.offsetLeft;
        y += elem.offsetTop;
    }

    return { left: x, top: y };
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}