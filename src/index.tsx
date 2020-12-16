// tslint:disable: no-console react-this-binding-issue

import "./ui/styles/index.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { MultiwalletProvider } from "@renproject/multiwallet-ui";

import { Main } from "./ui/main";

const render = (Main: () => JSX.Element) => {
    ReactDOM.render(
        <MultiwalletProvider>
            <div className="main">{<Main />}</div>
        </MultiwalletProvider>,
        document.getElementById("root") as HTMLElement
    );
};

render(Main);

// tslint:disable-next-line: no-any
if ((module as any).hot) {
    // tslint:disable-next-line: no-any
    (module as any).hot.accept("./ui/main", () => {
        const NextMain = require("./ui/main").Main;
        render(NextMain);
    });
}
