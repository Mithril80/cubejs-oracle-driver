
## cubejs oracle driver

> fork from cube.js official and change for support oracle

* cube.js

```code
const { OracleDriver } = require("cubejs-oracle-driver")
module.exports = {
    dbType: ({ dataSource } = {}) => {
        return "oracle"
    },
    driverFactory: ({ dataSource } = {}) => {
        return new OracleDriver({})
    }
};
```