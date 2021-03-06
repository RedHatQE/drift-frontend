import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { RowSelectVariant, Table, TableBody, TableHeader } from '@patternfly/react-table';
import { EmptyTable, SkeletonTable } from '@redhat-cloud-services/frontend-components';
import { Toolbar, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';

import BaselineTableKebab from './BaselineTableKebab/BaselineTableKebab';
import { baselinesTableActions } from './redux';
import baselinesReducerHelpers from './redux/helpers';
import BaselinesToolbar from './BaselinesToolbar/BaselinesToolbar';
import EmptyStateDisplay from '../EmptyStateDisplay/EmptyStateDisplay';
import TablePagination from '../Pagination/Pagination';

export class BaselinesTable extends Component {
    constructor(props) {
        super(props);

        this.state = {
            sortBy: {
                index: 1,
                direction: 'asc'
            },
            search: undefined,
            orderBy: 'display_name',
            orderHow: 'ASC',
            page: 1,
            perPage: 20,
            emptyStateMessage: [
                'This filter criteria matches no baselines.',
                'Try changing your filter settings.'
            ]
        };
    }

    async componentDidMount() {
        await window.insights.chrome.auth.getUser();
        this.fetchWithParams();
    }

    fetchWithParams = (fetchParams) => {
        const { tableId, fetchBaselines } = this.props;

        fetchParams = {
            ...this.state,
            ...fetchParams
        };

        baselinesReducerHelpers.fetchBaselines(tableId, fetchBaselines, fetchParams);
    }

    onSearch = (search) => {
        const { orderBy, orderHow } = this.state;

        let newSearch = search;
        this.setState({ search });
        this.fetchWithParams({ orderBy, orderHow, search: newSearch });
    }

    onSort = (_event, index, direction) => {
        const { search } = this.state;
        const { hasWritePermissions } = this.props;
        let orderBy = '';

        if (index === 0) {
            orderBy = 'display_name';
        } else if (index === 1) {
            orderBy = !hasWritePermissions ? 'updated' : 'display_name';
        } else if (index === 2) {
            orderBy = 'updated';
        }

        this.setState({
            sortBy: {
                index,
                direction
            },
            orderHow: direction.toUpperCase(),
            orderBy
        });

        this.fetchWithParams({ orderBy, orderHow: direction.toUpperCase(), search });
    }

    updatePagination = (pagination) => {
        this.setState({ page: pagination.page, perPage: pagination.perPage });
        this.fetchWithParams({ page: pagination.page, perPage: pagination.perPage });
    }

    renderRows(hasWritePermissions) {
        const { tableData, kebab, onClick, tableId } = this.props;
        let table = [];

        tableData.forEach((baseline) => {
            let row = [];

            if (onClick) {
                let link = <div>
                    <a className="pointer active-blue"
                        onClick={ () => onClick(baseline[0]) }
                    >
                        { baseline[1] }
                    </a>
                </div>;
                row.push(link);
            } else {
                row.push(baseline[1]);
            }

            row.push(baseline[2]);

            if (kebab && hasWritePermissions) {
                let kebab = <BaselineTableKebab
                    tableId={ tableId }
                    baselineRowData={ baseline }
                    fetchWithParams={ this.fetchWithParams }
                />;
                row.push(<div>{ kebab }</div>);
            }

            if (baseline.selected) {
                row.selected = true;
            }

            table.push(row);
        });

        return table;
    }

    renderTable(hasWritePermissions, hasReadPermissions) {
        const { columns, createButton, hasMultiSelect, kebab, loading, onSelect, tableData, tableId } = this.props;
        const { emptyStateMessage } = this.state;
        let tableRows = [];
        let table;

        if (!loading) {
            if (tableData.length === 0) {
                let emptyRow = <EmptyTable>
                    <EmptyStateDisplay
                        title={ 'No matching baselines found' }
                        text={ emptyStateMessage }
                    />
                </EmptyTable>;

                tableRows.push({
                    cells: [{
                        title: emptyRow,
                        props: { colSpan: columns.length }
                    }]
                });

                table = <Table
                    aria-label="Baselines Table"
                    cells={ columns }
                    rows={ tableRows }
                    canSelectAll={ false }
                >
                    <TableHeader />
                    <TableBody />
                </Table>;
            } else {
                if (!hasReadPermissions && !createButton) {
                    return <EmptyStateDisplay
                        icon={ LockIcon }
                        color='#6a6e73'
                        title={ 'You do not have access to Baselines' }
                        text={ [ 'Contact your organization administrator(s) for more information.' ] }
                    />;
                } else {
                    tableRows = this.renderRows(hasWritePermissions);

                    table = <Table
                        aria-label="Baselines Table"
                        onSort={ this.onSort }
                        onSelect={
                            hasWritePermissions || (tableId === 'CHECKBOX' && !kebab)
                                ? onSelect
                                : false
                        }
                        sortBy={ this.state.sortBy }
                        cells={ columns }
                        rows={ tableRows }
                        canSelectAll={ false }
                        selectVariant={ !hasMultiSelect ? RowSelectVariant.radio : RowSelectVariant.checkbox }
                    >
                        <TableHeader />
                        <TableBody />
                    </Table>;
                }
            }
        } else if (loading) {
            table = <SkeletonTable
                columns={ columns }
                rowSize={ 8 }
                onSelect={ true }
                hasRadio={ !hasMultiSelect }
                canSelectAll={ false }
                isSelectable={ true }
            />;
        }

        return table;
    }

    render() {
        const { kebab, createButton, exportToCSV, exportButton, hasMultiSelect, loading, onBulkSelect, selectedBaselineIds,
            tableData, tableId, totalBaselines, hasReadPermissions, hasWritePermissions } = this.props;
        const { page, perPage } = this.state;

        return (
            <React.Fragment>
                <BaselinesToolbar
                    createButton={ createButton }
                    exportButton={ exportButton }
                    kebab={ kebab }
                    onSearch={ this.onSearch }
                    tableId={ tableId }
                    fetchWithParams={ this.fetchWithParams }
                    tableData={ tableData }
                    onBulkSelect={ onBulkSelect }
                    hasMultiSelect={ hasMultiSelect }
                    selectedBaselineIds={ selectedBaselineIds }
                    isDeleteDisabled={ selectedBaselineIds?.length < 1 }
                    page={ page }
                    perPage={ perPage }
                    totalBaselines={ totalBaselines }
                    updatePagination={ this.updatePagination }
                    exportToCSV={ exportToCSV }
                    loading={ loading }
                    hasWritePermissions={ hasWritePermissions }
                    hasReadPermissions={ hasReadPermissions }
                />
                { this.renderTable(hasWritePermissions, hasReadPermissions) }
                <Toolbar>
                    <ToolbarGroup className='pf-c-pagination'>
                        <ToolbarItem>
                            <TablePagination
                                page={ page }
                                perPage={ perPage }
                                total={ !hasReadPermissions ? 0 : totalBaselines }
                                isCompact={ false }
                                updatePagination={ this.updatePagination }
                                tableId={ tableId }
                            />
                        </ToolbarItem>
                    </ToolbarGroup>
                </Toolbar>
            </React.Fragment>
        );
    }
}

BaselinesTable.propTypes = {
    loading: PropTypes.bool,
    tableData: PropTypes.array,
    fetchBaselines: PropTypes.func,
    tableId: PropTypes.string,
    hasMultiSelect: PropTypes.bool,
    onClick: PropTypes.func,
    kebab: PropTypes.bool,
    createButton: PropTypes.bool,
    exportButton: PropTypes.bool,
    onSelect: PropTypes.func,
    columns: PropTypes.array,
    onBulkSelect: PropTypes.func,
    selectedBaselineIds: PropTypes.array,
    totalBaselines: PropTypes.number,
    exportToCSV: PropTypes.func,
    hasReadPermissions: PropTypes.bool,
    hasWritePermissions: PropTypes.bool
};

function mapDispatchToProps(dispatch) {
    return {
        fetchBaselines: (tableId, params) => dispatch(baselinesTableActions.fetchBaselines(tableId, params)),
        exportToCSV: (exportData, baselineRowData)=> {
            dispatch(baselinesTableActions.exportToCSV(exportData, baselineRowData));
        }
    };
}

export default connect(null, mapDispatchToProps)(BaselinesTable);
