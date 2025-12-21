import { createElement } from "my-react";
import { Link } from "my-react-router";

export function Home() {
    return (
        <div>
            <h1>Welcome to the Home Page</h1>
            <Link to="/test">Test</Link>
        </div>
    );
}