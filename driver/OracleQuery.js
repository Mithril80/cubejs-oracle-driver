import {UserError,BaseFilter,BaseQuery} from "@cubejs-backend/schema-compiler";
import moment from "moment-timezone";

const GRANULARITY_VALUE = {
  day: 'DD',
  week: 'IW',
  hour: 'HH24',
  minute: 'mm',
  second: 'ss',
  month: 'MM',
  year: 'YYYY'
};

const dateTimeLocalMsRegex = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d$/;
const dateRegex = /^\d\d\d\d-\d\d-\d\d$/;

class OracleFilter extends BaseFilter {
  castParameter() {
    return ':"?"';
  }

  /**
   * "ILIKE" does't support
   */
  likeIgnoreCase(column, not, param, type) {
    const p = (!type || type === 'contains' || type === 'ends') ? '\'%\' || ' : '';
    const s = (!type || type === 'contains' || type === 'starts') ? ' || \'%\'' : '';    
    return `UPPER(${column})${not ? ' NOT' : ''} LIKE UPPER(${p}${this.allocateCastParam(param)}${s})`;
  }

  formatFromDate(date) // Per Oracle senza i millisecondi il to_date non accetta i millisecondi
	{
        if (date && date.match(dateTimeLocalMsRegex)) {
            return date;
        }
        if (date && date.match(dateRegex)) {
            return `${date}T00:00:00`;
        }
        if (!date) {
            return moment.tz(date, this.query.timezone).format('YYYY-MM-DDT00:00:00');
        }
        return moment.tz(date, this.query.timezone).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS);
    }

	formatToDate(date) {
        if (date && date.match(dateTimeLocalMsRegex)) {
            return date;
        }
        if (date && date.match(dateRegex)) {
            return `${date}T23:59:59`;
        }
        if (!date) {
            return moment.tz(date, this.query.timezone).format('YYYY-MM-DDT23:59:59');
        }
        return moment.tz(date, this.query.timezone).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS);
  }
}

export class OracleQuery extends BaseQuery {
  /**
   * "LIMIT" on Oracle it's illegal
   */
  groupByDimensionLimit() {
    const limitClause = this.rowLimit === null ? '' : ` FETCH NEXT ${this.rowLimit && parseInt(this.rowLimit, 10) || 10000} ROWS ONLY`;
    const offsetClause = this.offset ? ` OFFSET ${parseInt(this.offset, 10)} ROWS` : '';
    return `${offsetClause}${limitClause}`;
  }

  timestampFormat() { 
        return 'YYYY-MM-DD[T]HH:mm:ss[Z]';
  }
  
  /**
   * "AS" for table aliasing on Oracle it's illegal
   */
  get asSyntaxTable() {
    return '';
  }

  get asSyntaxJoin() {
    return this.asSyntaxTable;
  }

  /**
   * Oracle doesn't support group by index,
   * using forSelect dimensions for grouping
   */
  groupByClause() {
    const dimensions = this.forSelect().filter(item => !!item.dimension);
    if (!dimensions.length) {
      return '';
    }
    return ` GROUP BY ${dimensions.map(item => item.dimensionSql()).join(', ')}`;
  }

  convertTz(field) {
    /**
     * TODO: add offset timezone
     */
    return field;
  }

  dateTimeCast(value) {
    return `to_date(:"${value}", 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
  }

  timeStampCast(value) {
    return this.dateTimeCast(value);
  }

  timeStampParam(timeDimension) {
    return timeDimension.dateFieldType() === 'string' ? ':"?"' : this.timeStampCast('?');
  }

  timeGroupedColumn(granularity, dimension) {
    if (!granularity) {
      return dimension;
    }
    return `TRUNC(${dimension}, '${GRANULARITY_VALUE[granularity]}')`;
  }

  newFilter(filter) {
    return new OracleFilter(this, filter);
  }

  unixTimestampSql() {
    // eslint-disable-next-line quotes
    return `((cast (systimestamp at time zone 'UTC' as date) - date '1970-01-01') * 86400)`;
  }

  preAggregationTableName(cube, preAggregationName, skipSchema) {
    const name = super.preAggregationTableName(cube, preAggregationName, skipSchema);
    if (name.length > 128) {
      throw new UserError(`Oracle can not work with table names that longer than 64 symbols. Consider using the 'sqlAlias' attribute in your cube and in your pre-aggregation definition for ${name}.`);
    }
    return name;
  }
}
