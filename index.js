const core = require('@actions/core');
const github = require('@actions/github');
const semver = require("semver");
const {defaults} = require("@actions/github/lib/utils");

const EnvEnum = Object.freeze({ PROD: 'prd', STG: 'stg' });
const TypeEnum = Object.freeze({ APP: 'app', HELM: 'helm' });
const IncEnum = Object.freeze({ MAJOR: 'major', MINOR: 'minor', PATCH: 'patch',
    PRERELEASE: 'prerelease', NULL: ''});

async function findLatestSemver(inputArray, regexPattern) {
    let latestVersion = null;
    let match;

    inputArray.forEach(input => {
        while ((match = regexPattern.exec(input)) !== null) {
            if (semver.valid(match[1])) {
                if (latestVersion === null || semver.gt(match[1], latestVersion)) {
                    latestVersion = match[1];
                }
            }
        }
    });

    return latestVersion
}
async function getTagList(octokit) {
    const {owner, repo} = github.context.repo;

    let latestTag = null;

    let page = 1;
    const perPage = 100;
    let tagsArray = [];

    // Get Tag List
    while (true) {
        const {data: tags} = await octokit.rest.repos.listTags({
            owner,
            repo,
            per_page: perPage,
            page: page,
        });

        if (tags.length === 0) {
            break;
        }

        for (const tag of tags) {
            tagsArray.push(tag.name);
        }

        if (tags.length < perPage) {
            break;
        }

        page += 1;
    }

    return tagsArray;
}

async function getNewTag(latestStgTag, latestProdTag, startVersion, prereleaseStart, postfix, inc) {
    let newTag = null;
    if (!latestStgTag && !latestProdTag) {
        console.log("Add initial tag");
        newTag = semver.inc(startVersion, inc, postfix, prereleaseStart); // 0.0.1-stage.0
    } else if (!latestStgTag) {
        console.log("getFirstTag from latestProdTag");
        newTag = semver.inc(latestProdTag, inc, postfix, prereleaseStart); // 1.2.4-stage.0
    } else if (!latestProdTag) {
        console.log("getNextTag from latestStgTag");
        newTag = semver.inc(latestStgTag, inc, postfix, prereleaseStart); // 1.2.3-stage.n+1
    } else {
        if (semver.gte(latestProdTag, latestStgTag)) {
            console.log("if(latestProdTag >= latestStgTag) getFirstTag from latestProdTag");
            newTag = semver.inc(latestProdTag, inc, postfix, prereleaseStart); // 1.2.4-stage.0
        } else {
            console.log("if(latestProdTag < latestStgTag) getNextTag from latestStgTag");
            newTag = semver.inc(latestStgTag, inc, postfix, prereleaseStart); // 1.2.3-stage.n+1
        }
    }

    return newTag;
}

async function run() {
    try {
        //// Get inputs
        const token = core.getInput('github-token', { required: true });
        const env = core.getInput('env', { required: true });
        const version_type = core.getInput('version-type', { required: true });
        const increment = core.getInput('increment',{ required: false });

        //// Set values
        const octokit = github.getOctokit(token);
        let postfix;
        let newStgTag = null;
        let newProdTag = null;
        let latestStgTag = null;
        let latestProdTag = null;
        let inc = null;

        //// Validation checks for Enum variables
        if (![EnvEnum.PROD, EnvEnum.STG].includes(env)) {
            throw new Error(`Invalid environment: ${env}. Allowed values: 'prd', 'stg'`);
        }
        if (![TypeEnum.APP, TypeEnum.HELM].includes(version_type)) {
            throw new Error(`Invalid version type: ${version_type}. Allowed values: 'app', 'helm'`);
        }
        if (![IncEnum.MAJOR, IncEnum.MINOR, IncEnum.PATCH, IncEnum.NULL].includes(increment)) {
            throw new Error(`Invalid increment type: ${increment}. Allowed values: 'major','minor','patch',''`);
        }

        //// Policy Settings
        // Set inc
        if(env === 'stg'){
            inc = 'prerelease';
        } else if (env === 'prd' && increment === '') {
            inc = 'patch';
        } else {
            inc = increment
        }

        // Set Version Policy
        const startVersion = '0.0.0';
        const prereleaseStart = '0';

        // Set Regex
        let appStageRegexPattern = null;
        let helmStageRegexPattern = null;
        const prodRegexPattern = new RegExp(`(^\\d+\\.\\d+\\.\\d+$)`, 'g');
        const tagsArray = await getTagList(octokit);

        // Set postfix
        switch (version_type) {
            case 'app':
                console.log("version type = app");
                postfix = "stage";
                appStageRegexPattern = new RegExp(`(^\\d+\\.\\d+\\.\\d+-${postfix}\\.\\d+$)`, 'g');
                latestStgTag = await findLatestSemver(tagsArray, appStageRegexPattern);
                break;

            case 'helm':
                console.log("version type = helm");
                postfix = "";
                helmStageRegexPattern = new RegExp(`(^\\d+\\.\\d+\\.\\d+-\\d+$)`, 'g');
                latestStgTag = await findLatestSemver(tagsArray, helmStageRegexPattern);
                break;
        }

        //// Get Tags
        // Get prod Latest Tag
        latestProdTag = await findLatestSemver(tagsArray, prodRegexPattern);

        // Get New Tags
        const newTag  = await getNewTag(latestStgTag, latestProdTag, startVersion, prereleaseStart, postfix, inc);
        switch (env) {
            case 'stg':
                newStgTag = newTag;
                break;

            case 'prd':
                newProdTag = newTag;
                break;
        }

        //// Set outputs
        core.setOutput('new-prd-tag', newProdTag);
        core.setOutput('new-stg-tag', newStgTag);
        core.setOutput('latest-prd-tag', latestProdTag);
        core.setOutput('latest-stg-tag', latestStgTag);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
