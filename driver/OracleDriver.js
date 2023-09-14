const { BaseDriver } = require('@cubejs-backend/query-orchestrator');
const oracledb = require('oracledb');
const { reduce } = require('ramda');

oracledb.fetchAsString = [ oracledb.NUMBER ]; //any number queried will be returned as string

const sortByKeys = (unordered) => {
  const ordered = {};

  Object.keys(unordered).sort().forEach((key) => {
    ordered[key] = unordered[key];
  });

  return ordered;
};

const reduceCb = (result, i) => {
  let schema = (result[i.table_schema] || {});
  let tables = (schema[i.table_name] || []);
  let attributes = new Array();

  if (i.key_type === "P" || i.key_type === "U") {
    attributes.push(["primaryKey"]);
  }

  tables.push({
    name: i.column_name,
    type: i.data_type,
    attributes
  });

  schema[i.table_name] = tables.sort();
  result[i.table_schema] = sortByKeys(schema);

  return sortByKeys(result);
};

class OracleDriver extends BaseDriver {
  /**
   * Returns default concurrency value.
   */
  static getDefaultConcurrency() {
    return 2;
  }

  constructor(config) {
    super();
    this.db = oracledb;
    this.db.outFormat = this.db.OBJECT;
    this.db.partRows = 100000;
    this.db.maxRows = 100000;
    this.db.prefetchRows = 500;

    this.config = config || {
      user: process.env.CUBEJS_DB_USER,
      password: process.env.CUBEJS_DB_PASS,
      db: process.env.CUBEJS_DB_NAME,
      host: process.env.CUBEJS_DB_HOST,
      port: process.env.CUBEJS_DB_PORT || 1521,
      connectionString: process.env.CUBEJS_DB_CONNECTION_STRING,
      _enableStats: (process.env.CUBEJS_DB_ENABLE_STAT === 'true') || false,
      poolMin: 0,
      poolMax: config.CUBEJS_DB_POOL_MAX || 50,
    };

    if (!this.config.connectionString) {
      this.config.connectionString = `${this.config.host}/${this.config.db}`
    }
  }

  async tablesSchema() {
    const data = await this.query(`
      select tc.owner         "table_schema"
          , tc.table_name     "table_name"
          , tc.column_name    "column_name"
          , tc.data_type      "data_type"
          , c.constraint_type "key_type"
      from all_tab_columns tc
      left join all_cons_columns cc 
        on (tc.owner, tc.table_name, tc.column_name) 
        in ((cc.owner, cc.table_name, cc.column_name))
      left join all_constraints c 
        on (tc.owner, tc.table_name, cc.constraint_name) 
        in ((c.owner, c.table_name, c.constraint_name)) 
        and c.constraint_type 
        in ('P','U')
      where tc.owner = user
    `);

    return reduce(reduceCb, {}, data);
  }

  async getConnectionFromPool() {
    if (!this.pool) {
      this.pool = await this.db.createPool(this.config);
    }
    return this.pool.getConnection()
  }

  async testConnection() {
    return (
        await this.getConnectionFromPool()
    ).execute('SELECT 1 FROM DUAL');
  }

  async query(query, values) {
    let conn;
    const startTime = Date.now();

    try {
      const timeout = (process.env.CUBEJS_DB_CONNECTION_CALL_TIMEOUT || 30) * 1000;
      console.log("Get connection driver 6")

      conn = await this.getConnectionFromPool();
      conn.callTimeout = timeout;

      let endTime = Date.now();
      let seconds = Number((endTime - startTime) / 1000).toFixed(3);

      console.log(`Timeout connection setting to ${timeout}s. Get connection into ${seconds}s`);
      

      const res = await conn.execute(query, values || {});

      endTime = Date.now();
      seconds = Number((endTime - startTime) / 1000).toFixed(3);

      console.log(`Execute query ${query} into ${seconds}s`);
      console.log(`Parameters query: ${values}`);
      
      return res && res.rows;
    } catch (e) {
      console.log("Error during execute query");
      throw (e);
    } finally {
      if(conn) {
        try {
          console.log("Release connection");
          await conn.close();
        } catch (err) {
          console.error(err);
        }
      }
      this.pool._logStats();
    }
  }

  release() {
    console.log("Pool closed");
    return this.pool && this.pool.close();
  }
}

module.exports = OracleDriver;
