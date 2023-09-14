
## cubejs oracle driver

> fork from cube.js official and change for support oracle

* cube.js

```code
const { OracleDriver, OracleQuery } = require("oracledb6-cubejs-driver")
module.exports = {
    dialectFactory: (dataSource) => {        
        return OracleQuery
    },
    dbType: ({ dataSource } = {}) => {
        return "oracledb6"
    },
    driverFactory: ({ dataSource } = {}) => {
        return new OracleDriver()
    }
};
```
