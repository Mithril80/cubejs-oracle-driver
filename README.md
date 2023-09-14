
## cubejs oracle driver

> fork from cube.js official and change for support oracle

* cube.js

```code
const { OracleDriver, OracleQuery } = require("oracle-v6-cubejs-driver")
module.exports = {
    dialectFactory: (dataSource) => {        
        return OracleQuery
    },
    dbType: ({ dataSource } = {}) => {
        return "oracle-driver6"
    },
    driverFactory: ({ dataSource } = {}) => {
        return new OracleDriver({})
    }
};
```
