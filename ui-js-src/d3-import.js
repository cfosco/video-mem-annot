/**
 * d3 is a huge library; importing just what we need allows us to
 * ship a much smaller file
 */

import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, arc } from 'd3-shape';
import { format } from 'd3-format';
import { select, mouse } from 'd3-selection';

const d3 = {
  scaleLinear,
  axisBottom,
  axisLeft,
  line,
  arc,
  format,
  select,
  mouse,
}

export default d3;
