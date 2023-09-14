
## cubejs oracle driver

> fork from cube.js official and change for support oracle

* cube.js

```code
const { OracleDriver } = require("oracle-cubejs-driver")
module.exports = {
    dbType: ({ dataSource } = {}) => {
        return "oracle-driver6"
    },
    driverFactory: ({ dataSource } = {}) => {
        return new OracleDriver({})
    }
};
```