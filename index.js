BEM.DOM.decl({block: 'i-key-navigate', baseBlock: 'history-state'}, {
    onSetMod: {
        js: function () {
            this.bindKeyTo(window, 'down', this.switchElem('bottom'));
            this.bindKeyTo(window, 'up', this.switchElem('top'));
            this.bindKeyTo(window, 'left', this.switchElem('left'));
            this.bindKeyTo(window, 'right', this.switchElem('right'));
            this.bindKeyTo(window, 'enter', this._onEnter);
            this.bindKeyTo(window, 'esc', this._onEsc);

            this.channel('tabs').on('switch', this._onTabSwitch);

            this.channel('history-state').on('unset', this._onEsc.bind(this));

            this._prepare();

            // this._getElemsMap();

            window.ikn = this;

        }
    },
    _prepare: function () {
        var blocksSelector = this._blocksSelectors.join(',');

        this._blockMap = this._getElemsMap($(document), blocksSelector);
    },
    switchElem: function (direction) {
        return function () {
            if (!this._insideBlock) {
                return this._switchBlock(direction);
            } else if (this._currentBlock && this._insideBlock) {
                return this._switchElem(direction);
            }
        };
    },
    _switchBlock: function (direction) {
        this._prevBlock = this._currentBlock || null;
        this._currentBlock = this._getNext(this._currentBlock, this._blockMap, direction);

        this._updateSelection();

        // TODO индекс элемента?
        this.setState('i-key-navigate', 500);
        this._blockSelected = true;

        return false;
    },
    _switchElem: function (direction) {
        this._prevElem = this._currentElem || null;
        this._currentElem = this._getNext(this._currentElem, this._currentBlock._elemMap, direction);


        if (this._currentElem.$elem.hasClass('tab')) {
            this._currentElem.$elem.click();
        }

        this.afterCurrentEvent(this._updateElemsMap);

        this._updateElemSelection();

        return false;
    },
    _onTabSwitch: function () {
        // TODO пересчет карты
        // console.log('next tab');
    },
    _onEnter: function () {
        var curBlock = this._currentBlock;

        if (curBlock && !this._insideBlock) {
            this._blockSelected = false;
            // TODO индекс элемента?
            this.setState('i-key-navigate_inside', 500);

            this._insideBlock = true;
            this._updateSelection();
            curBlock._elemMap = this._getElemsMap(curBlock.$elem, 'a, .input__control');

            this._currentElem = null;
            this._switchElem();
            return false;
        }
    },
    _onEsc: function (e, data) {
        // console.log(e, data)

        // if (data.id === 'i-key-navigate_inside') {
        //     console.log('выйти из блока')
        // }
        //
        // if (data.id === 'i-key-navigate') {
        //     console.log('сбросить блок')
        // }

        if (data.id === 'i-key-navigate_inside' && data.curId === 'i-key-navigate' && this._currentBlock && this._insideBlock) {
            this._prevElem = this._currentElem;
            this._currentElem = null;
            this._insideBlock = false;
            this._blockSelected = true;
            this._updateElemSelection();
            this._updateSelection();
        } else if (data.id !== 'i-key-navigate_inside' && this._currentBlock && this._blockSelected) {
            this._blockSelected = false;
            this._prevBlock = this._currentBlock;
            this._currentBlock = null;
            this._updateSelection();
        }
    },
    _getNext: function (elem, elemMap, direction) {
        var nextElems, num;
        // var alternatives = {
        //     right: 'bottom',
        //     left: 'top',
        //     top: 'left',
        //     bottom: 'right'
        // };


        if (!elem) {
            return elemMap[0];
        }

        // массив элементов в направлении
        nextElems = elem[direction] || [];

        // Если в этом направлении нет элементов => пробуем альтернативный
        if (!nextElems.length) {
            // nextElems = elem[alternatives[direction]] || [];
            // // Если в альтернативном направлении нет элементов - венуть текущий
            // if (!nextElems.length) {
            return elem;
            // }
        }

        num = (direction === 'right' || direction === 'bottom') ? 0 : (nextElems.length - 1);

        // console.log(elemMap[num]);

        return elemMap[nextElems[num]];

    },
    _updateSelection: function () {
        if (this._prevBlock) {
            this._prevBlock.$elem.removeClass('i-key_selected');
        }
        if (this._currentBlock) {
            this._currentBlock.$elem.toggleClass('i-key_selected', !this._insideBlock);
            $(window).scrollTop(this._currentBlock.$elem.offset().top);
        }
    },
    _updateElemSelection: function () {
        if (this._prevElem) {
            this._prevElem.$elem.blur();
            this._prevElem.$elem.removeClass('i-key_selected');
        }
        if (this._currentElem) {
            if (this._currentElem.$elem.is('a, input')) {
                this._currentElem.$elem.focus();
            }
            this._currentElem.$elem.toggleClass('i-key_selected', this._insideBlock);
        }
    },
    _updateElemsMap: function () {
        var currentIsTab = this._currentElem && this._currentElem.$elem.hasClass('tab'),
            prevIsTab = this._prevElem && this._prevElem.$elem.hasClass('tab'),
            // Если перешли с таба на элементы - выкидываем все табы, кроме текущего из карты
            notSelector = (!currentIsTab && prevIsTab) ? '.tab:not(.tab_current_yes)' : '';

        // Если переключились с таба на элементы или наоборот или если с таба на таб - обновить карту элементов
        if ((!currentIsTab && prevIsTab) || currentIsTab) {
            this._currentBlock._elemMap = this._getElemsMap(this._currentBlock.$elem, 'a, .input__control', notSelector);
            this._currentElem = this._getElemFromNewMap(this._currentElem, this._currentBlock._elemMap);
        }
    },
    _getElemFromNewMap: function (elem, newMap) {
        var i;

        for (i = 0; i < newMap.length; i++) {
            if (elem.$elem[0] === newMap[i].$elem[0]) {
                return newMap[i];
            }
        }

        return newMap[0];
    },
    _getElemsMap: function ($container, selector, notSelector) {
        var elemOffsets = [];
        var map;

        notSelector = notSelector || '';

        $container
            .find(selector)
            .filter(':visible')
            .not(notSelector)
            .each(function(i, item) {
                var offset = $(item).offset(),
                    width = Math.floor($(item).width()),
                    height = Math.floor($(item).height()),
                    left = Math.ceil(offset.left),
                    top = Math.ceil(offset.top),
                    right = left + width,
                    bottom = top + height;

                elemOffsets.push({
                    $elem: $(item),
                    left: left,
                    right: right,
                    top: top,
                    bottom: bottom
                });
            });


        map = elemOffsets.map(function (elem, i, allElems) {
            return {
                $elem: elem.$elem,
                right: getMapToDirection(elem, allElems, 'right'),
                left: getMapToDirection(elem, allElems, 'left'),
                top: getMapToDirection(elem, allElems, 'top'),
                bottom: getMapToDirection(elem, allElems, 'bottom')
            };

        });

        return map;


        function getMapToDirection(elem, allElems, direction) {
            var vertical = direction === 'bottom' || direction === 'top',
                filteredElems,
                // Получаем элементы в нужном направлении от текущего
                elems = allElems
                    .filter(getElemsBySideFrom(direction, elem));

            filteredElems = elems
                .filter(inRowWith(elem, vertical));

            if (filteredElems.length) {
                elems = filteredElems;
            }

            elems = elems
                .sort(sortByMiddleClose(elem))
                .filter(function (curElem, i) {
                    return i === 0;
                })
                .map(getNum(allElems));

            return elems;
        }


        function sortByMiddleClose(elem) {
            var elemMiddleX = (elem.right + elem.left) / 2,
                elemMiddleY = (elem.bottom + elem.top) / 2;


            return function (cur, prev) {
                var middleLengths = [cur, prev].map(function(curElem) {
                    var curElemMiddleX = (curElem.right + curElem.left) / 2,
                        curElemMiddleY = (curElem.bottom + curElem.top) / 2;

                    return Math.sqrt(Math.pow(elemMiddleX - curElemMiddleX, 2) + Math.pow(elemMiddleY - curElemMiddleY, 2));
                });

                return middleLengths[0] - middleLengths[1];

            };
        }



        // function sortByMiddleClose(direction, elem, vertical) {
        //     var start = vertical ? 'left' : 'top',
        //         end = vertical ? 'right' : 'bottom',
        //         elemMiddle = (elem[end] + elem[start]) / 2;
        //
        //
        //     return function (cur, prev) {
        //         var curMiddle = (cur[end] + cur[start]) / 2,
        //             prevMiddle = (prev[end] + prev[start]) / 2;
        //
        //         return Math.abs(curMiddle - elemMiddle) + Math.abs(elem[direction] - cur[getInverse(direction)]) -
        //             Math.abs(prevMiddle - elemMiddle) - Math.abs(elem[direction] - prev[getInverse(direction)]);
        //
        //     };
        // }


        // function sortByMiddleClose(direction, elem, vertical) {
        //     var start = vertical ? 'left' : 'top',
        //         end = vertical ? 'right' : 'bottom',
        //         elemMiddle = (elem[end] + elem[start]) / 2;
        //
        //
        //     return function (cur, prev) {
        //         var curDirectionLength = Math.abs(elem[direction] - cur[getInverse(direction)]),
        //             prevDirectionLength = Math.abs(elem[direction] - prev[getInverse(direction)]),
        //             curMiddleLength = Math.min(Math.abs(cur[end] - elemMiddle), Math.abs(cur[start] - elemMiddle)),
        //             prevMiddleLength = Math.min(Math.abs(prev[end] - elemMiddle), Math.abs(prev[start] - elemMiddle));
        //
        //         return curMiddleLength + curDirectionLength -
        //             (prevMiddleLength + prevDirectionLength);
        //
        //     };
        // }


        // function getMapToDirection(elem, allElems, direction) {
        //     var inverseDirection = getInverse(direction), filteredElems,
        //         vertical = direction === 'bottom' || direction === 'top',
        //         // Получаем элементы в нужном направлении от текущего
        //         elems = allElems.filter(getElemsBySideFrom(direction, elem));
        //
        //     // Фильтруем элементы попавшие в строку/колонку с текущим элементом
        //     filteredElems = elems.filter(inRowWith(elem, vertical));
        //     if (filteredElems.length) {
        //         elems = filteredElems;
        //     }
        //
        //     elems = elems
        //         // сортируем по противоположной от направления границе (ближе к элементу)
        //         .sort(sortBorder(inverseDirection))
        //         // выбираем элементы в одной линии, перпендикулярной направлению
        //         .filter(sameBorderElems(inverseDirection))
        //         // сортируем по вертикали или горизонтали для перемещения по элементам
        //         .sort(sortBorder(vertical ? 'left' : 'top'))
        //         // Возвращаем номера в исходном(итоговом) массиве для простой ссылки
        //         .map(getNum(allElems));
        //
        //     return elems;
        // }


        // function getMapToDirection(elem, allElems, direction) {
        //     var inverseDirection = getInverse(direction),
        //         vertical = direction === 'bottom' || direction === 'top',
        //         elems = allElems
        //             // Фильтруем элементы попавшие в строку/колонку с текущим элементом
        //             .filter(inRowWith(elem, vertical))
        //             // Получаем элементы в нужном направлении от текущего
        //             .filter(getElemsBySideFrom(direction, elem))
        //             // сортируем по противоположной от направления границе (ближе к элементу)
        //             .sort(sortBorder(inverseDirection))
        //             // выбираем элементы в одной линии, перпендикулярной направлению
        //             .filter(sameBorderElems(inverseDirection))
        //             // сортируем по вертикали или горизонтали для перемещения по элементам
        //             .sort(sortBorder(vertical ? 'left' : 'top'))
        //             // Возвращаем номера в исходном(итоговом) массиве для простой ссылки
        //             .map(getNum(allElems));
        //
        //     return elems;
        // }

        function inRowWith(elem, vertical) {
            var start = vertical ? 'left' : 'top',
                end = vertical ? 'right' : 'bottom';

            return function (curElem) {
                return (elem[start] > curElem[start] && elem[start] < curElem[end]) ||
                    (elem[end] < curElem[end] && elem[end] > curElem[start]) ||
                    (elem[end] >= curElem[end] && elem[start] <= curElem[start]);
            };
        }

        // Получить все элементы, находящиеся в направлении direction от элемента link
        function getElemsBySideFrom(direction, elem) {
            var invert = direction === 'right' || direction === 'bottom';

            return function (curElem) {
                var first = !invert ? elem[direction] : curElem[getInverse(direction)],
                    second = !invert ? curElem[getInverse(direction)] : elem[direction];

                return first >= second;
            };
        }

        function getInverse(direction) {
            var alternatives = {
                right: 'left',
                left: 'right',
                top: 'bottom',
                bottom: 'top'
            };

            return alternatives[direction];
        }

        // function sortBorder(border) {
        //     return function(cur, prev) {
        //         return cur[border] - prev[border];
        //     };
        // }
        //
        // function sameBorderElems(border) {
        //     var last = border === 'right' || border === 'bottom';
        //
        //     return function (sortLink, i, all) {
        //         return sortLink[border] === all[last ? (all.length - 1) : 0][border];
        //     };
        // }

        function getNum(allElems) {
            return function (elem) {
                return allElems.indexOf(elem);
            };
        }
    },
    _blocksSelectors: ['.header', '.news', '.tv', '.suggest2-form', '.video', '.services']
});
