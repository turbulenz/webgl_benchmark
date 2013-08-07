set yrange [ 0 : $y_axis_max ]
unset key
set term png truecolor enhanced font "Times,15"

set output "$output"
plot [0:3600] '$fileinput0' every ::2 with points pointtype 7 ps 0.5
